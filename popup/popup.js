document.addEventListener('DOMContentLoaded', () => {
  const keywordInput = document.getElementById('keyword-input');
  const urlInput = document.getElementById('url-input');
  const folderSelect = document.getElementById('folder-select');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const bookmarkList = document.getElementById('bookmark-list');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const newFolderBtn = document.getElementById('new-folder-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const moonIcon = document.getElementById('moon-icon');
  const sunIcon = document.getElementById('sun-icon');
  let editingKeyword = null;

  let state = {
    bookmarks: {},
    structure: []
  };

  // Theme logic
  function applyTheme(isDark) {
    if (isDark) {
      document.body.classList.add('dark-mode');
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    } else {
      document.body.classList.remove('dark-mode');
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    }
  }

  chrome.storage.local.get(['isDarkMode'], (result) => {
    let isDark = result.isDarkMode;
    if (isDark === undefined) {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme(isDark);
  });

  themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    applyTheme(isDark);
    chrome.storage.local.set({ isDarkMode: isDark });
  });

  // Pre-fill URL with current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      urlInput.value = tabs[0].url;
      keywordInput.focus();
    }
  });

  // Load state
  function loadState() {
    chrome.storage.local.get(['bookmarks', 'structure'], (result) => {
      state.bookmarks = result.bookmarks || {};
      
      if (result.structure && Array.isArray(result.structure)) {
        state.structure = result.structure;
      } else {
        // Migration/First-time setup
        state.structure = Object.keys(state.bookmarks)
          .sort((a, b) => a.localeCompare(b))
          .map(k => ({ type: 'bookmark', id: k }));
        chrome.storage.local.set({ structure: state.structure });
      }
      
      renderBookmarks();
    });
  }

  function saveStructureFromDOM() {
    function parseList(ul) {
      const arr = [];
      ul.querySelectorAll(':scope > li').forEach(li => {
        if (li.dataset.type === 'folder') {
          arr.push({
            type: 'folder',
            id: li.dataset.id,
            name: li.dataset.name,
            isOpen: li.classList.contains('open'),
            children: parseList(li.querySelector(':scope > .folder-content'))
          });
        } else if (li.dataset.type === 'bookmark') {
          arr.push({ type: 'bookmark', id: li.dataset.id });
        }
      });
      return arr;
    }
    
    state.structure = parseList(bookmarkList);
    chrome.storage.local.set({ structure: state.structure });
    updateFolderSelect();
  }

  function updateFolderSelect() {
    function getFolders(arr, path = '') {
      let folders = [];
      for (let item of arr) {
        if (item.type === 'folder') {
          const currentPath = path ? `${path} / ${item.name}` : item.name;
          folders.push({ id: item.id, name: currentPath });
          if (item.children) {
            folders = folders.concat(getFolders(item.children, currentPath));
          }
        }
      }
      return folders;
    }

    const folders = getFolders(state.structure);
    if (folders.length === 0) {
      folderSelect.style.display = 'none';
    } else {
      folderSelect.style.display = 'block';
      const currentVal = folderSelect.value;
      folderSelect.innerHTML = '<option value="root">Root (No Folder)</option>';
      folders.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        folderSelect.appendChild(opt);
      });
      if (currentVal && (currentVal === 'root' || folders.some(f => f.id === currentVal))) {
        folderSelect.value = currentVal;
      }
    }
  }

  function renderBookmarks() {
    bookmarkList.innerHTML = '';
    
    if (state.structure.length === 0 && Object.keys(state.bookmarks).length === 0) {
      bookmarkList.innerHTML = '<li><span style="color:var(--text-muted);font-size:12px;padding:8px;">No bookmarks saved yet.</span></li>';
      return;
    }
    
    function createBookmarkNode(item) {
      const data = state.bookmarks[item.id];
      if (!data) return null; // Stale reference
      
      const li = document.createElement('li');
      li.className = 'bookmark-item';
      li.dataset.type = 'bookmark';
      li.dataset.id = item.id;
      
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'bookmark-info';
      infoDiv.style.flexGrow = '1';
      
      const keySpan = document.createElement('span');
      keySpan.className = 'bookmark-keyword';
      keySpan.textContent = item.id;
      
      const urlSpan = document.createElement('span');
      urlSpan.className = 'bookmark-url';
      urlSpan.textContent = data.url;
      urlSpan.title = data.url;
      
      infoDiv.appendChild(keySpan);
      infoDiv.appendChild(urlSpan);
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'bookmark-actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      editBtn.title = 'Edit';
      editBtn.onclick = () => editBookmark(item.id, data.url);
      
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      delBtn.title = 'Delete';
      delBtn.onclick = () => deleteBookmark(item.id);
      
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(delBtn);
      
      li.appendChild(dragHandle);
      li.appendChild(infoDiv);
      li.appendChild(actionsDiv);
      return li;
    }
    
    function createFolderNode(item) {
      const li = document.createElement('li');
      li.className = 'folder-item';
      if (item.isOpen) li.classList.add('open');
      li.dataset.type = 'folder';
      li.dataset.id = item.id;
      li.dataset.name = item.name;
      
      const header = document.createElement('div');
      header.className = 'folder-header';
      
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
      
      const toggle = document.createElement('span');
      toggle.className = 'folder-toggle';
      toggle.innerHTML = '▶';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'folder-name';
      nameSpan.textContent = item.name;
      
      const editFolderBtn = document.createElement('button');
      editFolderBtn.className = 'edit-btn';
      editFolderBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      editFolderBtn.title = 'Edit';
      editFolderBtn.onclick = (e) => {
        e.stopPropagation();
        const newName = prompt("Enter new folder name:", item.name);
        if (newName && newName.trim() !== '' && newName !== item.name) {
          item.name = newName.trim();
          li.dataset.name = item.name;
          nameSpan.textContent = item.name;
          saveStructureFromDOM();
        }
      };
      
      const delFolderBtn = document.createElement('button');
      delFolderBtn.className = 'delete-btn';
      delFolderBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      delFolderBtn.title = 'Delete';
      delFolderBtn.onclick = (e) => {
        e.stopPropagation();
        if(confirm(`Delete folder "${item.name}" and all its contents?`)) {
           deleteFolder(item.id);
        }
      };
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'bookmark-actions';
      actionsDiv.appendChild(editFolderBtn);
      actionsDiv.appendChild(delFolderBtn);
      
      header.appendChild(dragHandle);
      header.appendChild(toggle);
      header.appendChild(nameSpan);
      header.appendChild(actionsDiv);
      
      header.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-actions') || e.target.closest('.drag-handle')) return;
        li.classList.toggle('open');
        saveStructureFromDOM();
      });
      
      const contentUl = document.createElement('ul');
      contentUl.className = 'folder-content';
      
      if (item.children) {
        item.children.forEach(child => {
           if (child.type === 'bookmark') {
             const childNode = createBookmarkNode(child);
             if (childNode) contentUl.appendChild(childNode);
           }
        });
      }
      
      li.appendChild(header);
      li.appendChild(contentUl);
      return li;
    }
    
    state.structure.forEach(item => {
      let node = null;
      if (item.type === 'bookmark') node = createBookmarkNode(item);
      else if (item.type === 'folder') node = createFolderNode(item);
      
      if (node) bookmarkList.appendChild(node);
    });
    
    initSortable();
    updateFolderSelect();
  }

  function initSortable() {
    if (typeof Sortable === 'undefined') return; // fail safe
    const commonOpts = {
      group: 'shared',
      animation: 150,
      handle: '.drag-handle',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onEnd: saveStructureFromDOM
    };
    
    new Sortable(bookmarkList, commonOpts);
    
    document.querySelectorAll('.folder-content').forEach(el => {
      new Sortable(el, commonOpts);
    });
  }

  // New Folder
  newFolderBtn.addEventListener('click', () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const folderId = 'folder_' + Date.now();
    
    let insertIndex = 0;
    for (let i = state.structure.length - 1; i >= 0; i--) {
      if (state.structure[i].type === 'folder') {
        insertIndex = i + 1;
        break;
      }
    }
    
    state.structure.splice(insertIndex, 0, {
      type: 'folder',
      id: folderId,
      name: name,
      isOpen: true,
      children: []
    });
    chrome.storage.local.set({ structure: state.structure }, renderBookmarks);
  });

  // Save bookmark
  saveBtn.addEventListener('click', () => {
    const keyword = keywordInput.value.trim().toLowerCase();
    const url = urlInput.value.trim();
    if (!keyword || !url) {
      saveStatus.textContent = "Please provide both keyword and URL.";
      saveStatus.style.color = "#ea4335";
      return;
    }
    
    const isNew = !state.bookmarks[keyword];
    
    if (editingKeyword && editingKeyword !== keyword) {
      delete state.bookmarks[editingKeyword];
      function renameInStruct(arr) {
        for (let item of arr) {
          if (item.type === 'bookmark' && item.id === editingKeyword) {
            item.id = keyword;
          } else if (item.type === 'folder' && item.children) {
            renameInStruct(item.children);
          }
        }
      }
      renameInStruct(state.structure);
    }
    
    state.bookmarks[keyword] = {
      url: url,
      createdAt: state.bookmarks[keyword] ? state.bookmarks[keyword].createdAt : new Date().toISOString()
    };
    
    if (isNew && (!editingKeyword || editingKeyword === keyword)) {
       const selectedFolderId = folderSelect.value;
       
       function insertBookmarkAfterExisting(arr, keywordId) {
         let insertIndex = arr.length;
         for (let i = arr.length - 1; i >= 0; i--) {
           if (arr[i].type === 'bookmark') {
             insertIndex = i + 1;
             break;
           }
         }
         arr.splice(insertIndex, 0, { type: 'bookmark', id: keywordId });
       }

       if (!selectedFolderId || selectedFolderId === 'root' || folderSelect.style.display === 'none') {
         insertBookmarkAfterExisting(state.structure, keyword);
       } else {
         function addToFolder(arr, targetId) {
           for (let item of arr) {
             if (item.type === 'folder' && item.id === targetId) {
               if (!item.children) item.children = [];
               insertBookmarkAfterExisting(item.children, keyword);
               item.isOpen = true; // Open folder to show the new item
               return true;
             } else if (item.type === 'folder' && item.children) {
               if (addToFolder(item.children, targetId)) return true;
             }
           }
           return false;
         }
         if (!addToFolder(state.structure, selectedFolderId)) {
           insertBookmarkAfterExisting(state.structure, keyword);
         }
       }
    }
    
    chrome.storage.local.set({ bookmarks: state.bookmarks, structure: state.structure }, () => {
      saveStatus.textContent = editingKeyword ? "Updated successfully!" : "Saved successfully!";
      saveStatus.style.color = "#0f9d58";
      keywordInput.value = '';
      editingKeyword = null;
      saveBtn.textContent = 'Save Bookmark';
      
      renderBookmarks();
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) urlInput.value = tabs[0].url;
        else urlInput.value = '';
      });
      
      setTimeout(() => saveStatus.textContent = "", 2000);
    });
  });

  // Edit helper
  function editBookmark(keyword, url) {
    keywordInput.value = keyword;
    urlInput.value = url;
    editingKeyword = keyword;
    saveBtn.textContent = 'Update Bookmark';
    keywordInput.focus();
  }

  keywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveBtn.click(); });
  urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveBtn.click(); });

  // Delete folder
  function deleteFolder(folderId) {
    function getKeysFromFolder(arr, targetId) {
      for (let item of arr) {
        if (item.type === 'folder' && item.id === targetId) {
          const keys = [];
          function collect(children) {
            for (let child of children) {
              if (child.type === 'bookmark') keys.push(child.id);
              else if (child.children) collect(child.children);
            }
          }
          collect(item.children);
          return keys;
        } else if (item.type === 'folder' && item.children) {
          const keys = getKeysFromFolder(item.children, targetId);
          if (keys) return keys;
        }
      }
      return null;
    }
    
    const keysToDelete = getKeysFromFolder(state.structure, folderId) || [];
    keysToDelete.forEach(k => delete state.bookmarks[k]);
    
    function removeFolder(arr) {
      return arr.filter(item => {
        if (item.type === 'folder' && item.id === folderId) return false;
        if (item.type === 'folder' && item.children) {
          item.children = removeFolder(item.children);
        }
        return true;
      });
    }
    state.structure = removeFolder(state.structure);
    
    chrome.storage.local.set({ bookmarks: state.bookmarks, structure: state.structure }, renderBookmarks);
  }

  // Delete bookmark
  function deleteBookmark(keyword) {
    delete state.bookmarks[keyword];
    
    function removeBookmark(arr) {
      return arr.filter(item => {
        if (item.type === 'bookmark' && item.id === keyword) return false;
        if (item.type === 'folder' && item.children) {
          item.children = removeBookmark(item.children);
        }
        return true;
      });
    }
    state.structure = removeBookmark(state.structure);
    
    chrome.storage.local.set({ bookmarks: state.bookmarks, structure: state.structure }, renderBookmarks);
  }

  // Export JSON
  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get(['bookmarks', 'structure'], (result) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
      const a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", "bookmarks_backup.json");
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  });

  // Import JSON trigger
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  // Handle Import JSON
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (importedData.bookmarks && importedData.structure) {
          // New format
          state.bookmarks = { ...state.bookmarks, ...importedData.bookmarks };
          
          const existingIds = new Set();
          function addIds(arr) { arr.forEach(i => { if (i.type==='bookmark') existingIds.add(i.id); if (i.children) addIds(i.children); }); }
          addIds(state.structure);
          
          function mergeItems(targetArr, sourceArr) {
            sourceArr.forEach(sourceItem => {
              if (sourceItem.type === 'bookmark') {
                if (!existingIds.has(sourceItem.id)) {
                  targetArr.push(sourceItem);
                  existingIds.add(sourceItem.id);
                }
              } else if (sourceItem.type === 'folder') {
                let existingFolder = targetArr.find(t => t.type === 'folder' && t.id === sourceItem.id);
                if (existingFolder) {
                  if (sourceItem.children) {
                    if (!existingFolder.children) existingFolder.children = [];
                    mergeItems(existingFolder.children, sourceItem.children);
                  }
                } else {
                  let newFolder = { ...sourceItem, children: [] };
                  if (sourceItem.children) {
                    mergeItems(newFolder.children, sourceItem.children);
                  }
                  targetArr.push(newFolder);
                }
              }
            });
          }
          
          mergeItems(state.structure, importedData.structure);
        } else {
          // Old format
          state.bookmarks = { ...state.bookmarks, ...importedData };
          const existingIds = new Set();
          function addIds(arr) { arr.forEach(i => { if (i.type==='bookmark') existingIds.add(i.id); if (i.children) addIds(i.children); }); }
          addIds(state.structure);
          
          Object.keys(importedData).forEach(k => {
            if (!existingIds.has(k)) {
              state.structure.push({ type: 'bookmark', id: k });
            }
          });
        }
        
        chrome.storage.local.set({ bookmarks: state.bookmarks, structure: state.structure }, () => {
          renderBookmarks();
          alert("Bookmarks imported successfully!");
        });
      } catch (err) {
        alert("Invalid JSON file.");
        console.error(err);
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  // Initial load
  loadState();
});