function maskPreservingSpaces(text, maskChar = '*') {
  return [...text].map((char) => (char === ' ' ? ' ' : maskChar)).join('')
}

function getUniqueSelector(el) {
  if (!el) return null
  const path = []

  while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
    let selector = el.nodeName.toLowerCase()

    if (el.id) {
      path.unshift(`${selector}#${el.id}`)
      break
    }

    const classList = Array.from(el.classList || []).filter(
      (cls) => !/^ng-|^react-|^dynamic-/.test(cls)
    )

    if (classList.length) selector += '.' + classList.join('.')

    const parent = el.parentElement
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (sibling) => sibling.tagName === el.tagName
      )
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(el) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    path.unshift(selector)
    el = el.parentElement
  }

  return path.join(' > ')
}

window.addEventListener('message', ({ data }) => {
  const { type, text, action, maskChar } = data
  if (type === 'APPLY_MASK') {
    maskSelectedText(text, action, maskChar)
  }
})

function maskSelectedText(selectedText, action, maskChar = '*') {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const span = document.createElement('span')
  span.dataset.original = selectedText
  span.dataset.maskAction = action

  switch (action) {
    case 'mask':
      span.textContent = maskPreservingSpaces(selectedText, maskChar)
      break
    case 'blur':
      span.textContent = selectedText
      span.classList.add('blur-text')
      break
    case 'custom-mask':
      span.textContent = maskPreservingSpaces(selectedText, maskChar)
      span.dataset.maskChar = maskChar
      break
  }

  const containerEl =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentNode
      : range.startContainer
  const selector = getUniqueSelector(containerEl)

  range.deleteContents()
  range.insertNode(span)

  saveMaskedData(selectedText, action, maskChar, selector)
}

function saveMaskedData(text, action, maskChar, selector) {
  const url = location.hostname
  chrome.storage.local.get([url], (res) => {
    const entries = res[url] || []
    entries.push({ text, action, maskChar, selector })
    chrome.storage.local.set({ [url]: entries })
  })
}

// Inject CSS once
;(function injectStyle() {
  const style = document.createElement('style')
  style.textContent = `.blur-text { filter: blur(5px) }`
  document.head.appendChild(style)
})()

// Re-apply masks on load
chrome.storage.local.get([location.hostname], (res) => {
  const entries = res[location.hostname] || []
  if (entries.length) {
    requestIdleCallback(() => applySavedMasks(entries))
  }
})

function applySavedMasks(entries) {
  for (const { text, action, maskChar, selector } of entries) {
    const el = document.querySelector(selector)
    if (!el) continue

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let node
    let applied = false

    while ((node = walker.nextNode()) && !applied) {
      const index = node.nodeValue.indexOf(text)
      if (index === -1) continue

      const span = document.createElement('span')
      span.dataset.original = text
      span.dataset.maskAction = action

      if (action === 'mask') {
        span.textContent = maskPreservingSpaces(text, '*')
      } else if (action === 'custom-mask') {
        span.textContent = maskPreservingSpaces(text, maskChar || '*')
        span.dataset.maskChar = maskChar
      } else if (action === 'blur') {
        span.textContent = text
        span.classList.add('blur-text')
      }

      const before = node.nodeValue.slice(0, index)
      const after = node.nodeValue.slice(index + text.length)
      const afterNode = node.splitText(before.length)
      afterNode.nodeValue = after

      node.parentNode.insertBefore(span, afterNode)
      applied = true
    }
  }
}
