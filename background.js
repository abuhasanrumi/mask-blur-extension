chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "mask", title: "Mask", contexts: ["selection"] })
  chrome.contextMenus.create({ id: "blur", title: "Blur", contexts: ["selection"] })
  chrome.contextMenus.create({ id: "mask-using", title: "Mask Using...", contexts: ["selection"] })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (["mask", "blur"].includes(info.menuItemId)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: applyMasking,
      args: [info.selectionText, info.menuItemId]
    })
  }

  if (info.menuItemId === "mask-using") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: maskUsingCustomChar,
      args: [info.selectionText]
    })
  }
})

function applyMasking(text, action) {
  window.postMessage({ type: "APPLY_MASK", text, action }, "*")
}

function maskUsingCustomChar(text) {
  const char = prompt("Enter the character you want to use for masking:")
  if (char) {
    window.postMessage({ type: "APPLY_MASK", text, action: "custom-mask", maskChar: char }, "*")
  }
}
