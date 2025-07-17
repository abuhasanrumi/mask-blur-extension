chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'mask',
    title: 'Mask',
    contexts: ['selection']
  })
  chrome.contextMenus.create({
    id: 'blur',
    title: 'Blur',
    contexts: ['selection']
  })
  chrome.contextMenus.create({
    id: 'mask-using',
    title: 'Mask Using...',
    contexts: ['selection']
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText) return

  if (['mask', 'blur'].includes(info.menuItemId)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text, action) => {
        window.postMessage({ type: 'APPLY_MASK', text, action }, '*')
      },
      args: [info.selectionText, info.menuItemId]
    })
  }

  if (info.menuItemId === 'mask-using') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        const char = prompt('Enter the character you want to use for masking:')
        if (char && char.length === 1) {
          window.postMessage(
            { type: 'APPLY_MASK', text, action: 'custom-mask', maskChar: char },
            '*'
          )
        }
      },
      args: [info.selectionText]
    })
  }
})
