function maskPreservingSpaces(text, maskChar = "*") {
  return text.split("").map(char => char === " " ? " " : maskChar).join("")
}


window.addEventListener("message", (event) => {
  const { type, text, action, maskChar } = event.data
  if (type === "APPLY_MASK") {
    if (action === "custom-mask") {
      maskSelectedText(text, action, maskChar)
    } else {
      maskSelectedText(text, action)
    }
  }
})


function maskSelectedText(selectedText, action, maskChar = "*") {
  const range = window.getSelection().getRangeAt(0)
  const span = document.createElement("span")
  span.dataset.original = selectedText
  span.dataset.maskAction = action

  if (action === "mask") {
    span.textContent = maskPreservingSpaces(selectedText, maskChar)
  } else if (action === "blur") {
    span.textContent = selectedText
    span.classList.add("blur-text")
  } else if (action === "custom-mask") {
    span.textContent = maskPreservingSpaces(selectedText, maskChar)
    span.dataset.maskChar = maskChar
  }

  console.log("span", span)


  range.deleteContents()
  range.insertNode(span)

  saveMaskedData(selectedText, action, maskChar)
}


function saveMaskedData(text, action, maskChar) {
  const url = location.hostname
  chrome.storage.local.get([url], (res) => {
    const entries = res[url] || []
    if (!entries.find(e => e.text === text)) {
      entries.push({ text, action, maskChar })
    }
    chrome.storage.local.set({ [url]: entries })
  })
}


// Inject blur CSS
const style = document.createElement("style")
style.textContent = `.blur-text { filter: blur(5px) }`
document.head.appendChild(style)

// Re-apply saved masking on page load
chrome.storage.local.get([location.hostname], (res) => {
  const entries = res[location.hostname] || []
  if (entries.length > 0) {
    applySavedMasks(entries)
  }
})

function applySavedMasks(entries) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodesToMask = []

  let node
  while (node = walker.nextNode()) {
    entries.forEach(({ text, action, maskChar }) => {
      if (node.nodeValue.includes(text)) {
        nodesToMask.push({ node, text, action, maskChar })
      }
    })
  }

  // Now safely mask the collected nodes
  nodesToMask.forEach(({ node, text, action, maskChar }) => {
    const span = document.createElement("span")
    span.dataset.original = text
    span.dataset.maskAction = action

    if (action === "mask") {
      span.textContent = maskPreservingSpaces(text, "*")
    } else if (action === "custom-mask") {
      span.textContent = maskPreservingSpaces(text, maskChar || "*")
      span.dataset.maskChar = maskChar
    } else if (action === "blur") {
      span.textContent = text
      span.classList.add("blur-text")
    }

    const parts = node.nodeValue.split(text)
    const after = node.splitText(parts[0].length)
    after.nodeValue = after.nodeValue.substring(text.length)
    node.parentNode.insertBefore(span, after)
  })
}

