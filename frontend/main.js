const app = document.getElementById('app');
console.log('=== Frontend main.js loaded ===');
console.log('App element:', app);
console.log('Current hash:', location.hash);
const nav = {
  list: document.getElementById('nav-list'),
  crlist: document.getElementById('nav-crlist'),
  New: document.getElementById('nav-new'),
  dashboard: document.getElementById('nav-dashboard')
};

function setActive(hash) {
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const id = hash.replace('#','').split('/')[0] || 'list';
  const el = document.getElementById('nav-' + id);
  if (el) el.classList.add('active');
}

function getToken() {
  return localStorage.getItem('pm_token') || null;
}

function setToken(token) {
  if (token) localStorage.setItem('pm_token', token);
  else localStorage.removeItem('pm_token');
}

let currentUser = null;

async function getCurrentUser() {
  if (currentUser) return currentUser;
  const token = getToken();
  if (!token) return null;
  try {
    // Decode JWT to get user info (simple decode, not verification - backend verifies)
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentUser = { id: payload.sub, email: payload.email, name: payload.name, isAdmin: payload.isAdmin };
    return currentUser;
  } catch {
    return null;
  }
}

// Column visibility management
function getColumnVisibility(viewType = 'list') {
  const key = `pm_column_visibility_${viewType}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  // Default: all columns visible
  return null;
}

function saveColumnVisibility(viewType, visibility) {
  const key = `pm_column_visibility_${viewType}`;
  localStorage.setItem(key, JSON.stringify(visibility));
}

function getDefaultColumns(viewType) {
  if (viewType === 'crlist') {
    return {
      'col-ticket': true,
      'col-name': true,
      'col-priority': true,
      'col-status': true,
      'col-milestone': true,
      'col-department': true,
      'col-owner': true,
      'col-pic': true,
      'col-date': true,
      'col-impact': true,
      'col-remark': true,
      'col-doc': true,
      'col-timeline': true,
      'col-actions': true
    };
  }
  return {
    'col-ticket': true,
    'col-name': true,
    'col-priority': true,
    'col-status': true,
    'col-milestone': true,
    'col-department': true,
    'col-owner': true,
    'col-pic': true,
    'col-date': true,
    'col-impact': true,
    'col-remark': true,
    'col-doc': true,
    'col-actions': true
  };
}

function clearUser() {
  currentUser = null;
  setToken(null);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format comment body with @mention highlighting
function formatCommentBody(text) {
  if (!text) return '';
  // Escape HTML first
  const escaped = escapeHtml(text);
  
  // Replace @mentions with highlighted spans
  // Match @ followed by word characters, spaces, hyphens, dots
  // Stop at: another @, punctuation, or multiple spaces (end of mention)
  let formatted = escaped;
  let result = '';
  let i = 0;
  
  while (i < formatted.length) {
    if (formatted[i] === '@') {
      // Found a potential mention
      let mentionStart = i;
      let mentionEnd = i + 1;
      let hasSpace = false;
      
      // Collect characters until we hit a stopping point
      while (mentionEnd < formatted.length) {
        const char = formatted[mentionEnd];
        
        // Stop at another @
        if (char === '@') break;
        
        // Stop at punctuation
        if ([',', '!', '?', ':', ';', ')', ']', '(', '[', '.'].includes(char)) break;
        
        // Track spaces
        if (char === ' ') {
          hasSpace = true;
          // Check if there are multiple spaces (likely end of mention)
          let lookAhead = mentionEnd + 1;
          while (lookAhead < formatted.length && formatted[lookAhead] === ' ') {
            lookAhead++;
          }
          if (lookAhead > mentionEnd + 1) {
            // Multiple spaces found, stop before the first space
            break;
          }
          
          // If we have a space and the next word looks like it's not part of the mention
          if (lookAhead < formatted.length) {
            const nextChar = formatted[lookAhead];
            // If next char is @ or punctuation, stop here
            if (nextChar === '@' || [',', '!', '?', ':', ';', ')', ']', '(', '[', '.'].includes(nextChar)) {
              break;
            }
            
            // If we already have a space in the mention, check if next word is clearly separate
            const currentMention = formatted.substring(mentionStart + 1, mentionEnd).trim();
            if (currentMention.includes(' ')) {
              // Extract next word
              let nextWordEnd = lookAhead;
              while (nextWordEnd < formatted.length && /[\w-]/.test(formatted[nextWordEnd])) {
                nextWordEnd++;
              }
              const nextWord = formatted.substring(lookAhead, nextWordEnd).toLowerCase();
              // Common words that indicate next part of sentence
              const commonWords = ['test', 'tes', 'the', 'is', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'of', 'in', 'on', 'at'];
              if (commonWords.includes(nextWord) || nextWord.length <= 2) {
                break; // Stop before the space
              }
            }
          }
        }
        
        // Allow word characters, spaces, hyphens, dots
        if (/[\w\s.-]/.test(char)) {
          mentionEnd++;
        } else {
          break;
        }
      }
      
      // Extract the mention text
      const mentionText = formatted.substring(mentionStart + 1, mentionEnd).trim();
      
      if (mentionText) {
        // Wrap in highlight span
        result += `<span class="mention">@${mentionText}</span>`;
        i = mentionEnd;
      } else {
        result += '@';
        i++;
      }
    } else {
      result += formatted[i];
      i++;
    }
  }
  
  // Replace newlines with <br>
  return result.replace(/\n/g, '<br>');
}

// Setup @mention autocomplete for textarea
function setupMentionAutocomplete(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  
  const autocomplete = document.getElementById('mention-autocomplete');
  if (!autocomplete) return;
  
  let currentMention = null;
  let filteredUsers = [];
  let selectedIndex = -1;
  
  textarea.addEventListener('input', async (e) => {
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Match @ followed by optional word characters (including spaces for names)
    const match = textBeforeCursor.match(/@([\w\s-]*)$/);
    
    if (match) {
      // Ensure LOOKUPS is loaded
      if (!LOOKUPS.users || LOOKUPS.users.length === 0) {
        await ensureLookups();
      }
      
      const query = (match[1] || '').toLowerCase().trim();
      const mentionStart = cursorPos - query.length - 1;
      currentMention = { start: mentionStart, end: cursorPos, query };
      
      // Filter users - if query is empty, show all active users
      let usersToFilter = (LOOKUPS.users || []).filter(u => {
        // Filter out inactive users
        if (u.active === false) return false;
        return true;
      });
      
      if (query) {
        usersToFilter = usersToFilter.filter(u => {
          const name = (u.name || '').toLowerCase();
          const nameNoSpaces = name.replace(/\s+/g, '');
          const email = (u.email || '').toLowerCase().split('@')[0];
          return name.includes(query) || 
                 nameNoSpaces.includes(query) || 
                 email.includes(query);
        });
      }
      
      filteredUsers = usersToFilter.slice(0, 10); // Show up to 10 results
      
      if (filteredUsers.length > 0) {
        selectedIndex = -1;
        showAutocomplete();
      } else {
        hideAutocomplete();
      }
    } else {
      hideAutocomplete();
    }
  });
  
  textarea.addEventListener('keydown', (e) => {
    if (!autocomplete.classList.contains('hidden')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredUsers.length - 1);
        updateAutocompleteSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateAutocompleteSelection();
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
      } else if (e.key === 'Escape') {
        hideAutocomplete();
      }
    }
  });
  
  function showAutocomplete() {
    autocomplete.innerHTML = filteredUsers.map((user, index) => `
      <div class="mention-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
        <strong>${escapeHtml(user.name || user.email || 'Unknown')}</strong>
        <span class="muted">${escapeHtml(user.email || '')}</span>
      </div>
    `).join('');
    
    autocomplete.classList.remove('hidden');
    
    // Get textarea position
    const textareaRect = textarea.getBoundingClientRect();
    
    // Position autocomplete directly below textarea, aligned to left
    autocomplete.style.position = 'fixed';
    autocomplete.style.top = `${textareaRect.bottom + 4}px`;
    autocomplete.style.left = `${textareaRect.left}px`;
    autocomplete.style.width = '320px';
    autocomplete.style.maxWidth = '90vw';
    autocomplete.style.zIndex = '10000';
    autocomplete.style.display = 'block';
    
    // Ensure it doesn't go off screen (adjust after render)
    setTimeout(() => {
      const autocompleteRect = autocomplete.getBoundingClientRect();
      if (autocompleteRect.right > window.innerWidth) {
        autocomplete.style.left = `${window.innerWidth - autocompleteRect.width - 10}px`;
      }
      if (autocompleteRect.bottom > window.innerHeight) {
        const newTop = textareaRect.top - autocompleteRect.height - 2;
        autocomplete.style.top = `${Math.max(10, newTop)}px`;
      }
      if (parseInt(autocomplete.style.left) < 10) {
        autocomplete.style.left = '10px';
      }
    }, 0);
    
    // Add click handlers
    autocomplete.querySelectorAll('.mention-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        insertMention(filteredUsers[index]);
      });
    });
  }
  
  function hideAutocomplete() {
    autocomplete.classList.add('hidden');
    currentMention = null;
    filteredUsers = [];
    selectedIndex = -1;
  }
  
  function updateAutocompleteSelection() {
    autocomplete.querySelectorAll('.mention-item').forEach((item, index) => {
      item.classList.toggle('selected', index === selectedIndex);
    });
  }
  
  function insertMention(user) {
    if (!currentMention) return;
    
    const mentionText = user.name || user.email || 'Unknown';
    const before = textarea.value.substring(0, currentMention.start);
    const after = textarea.value.substring(currentMention.end);
    textarea.value = `${before}@${mentionText} ${after}`;
    
    // Set cursor position after mention
    const newPos = before.length + mentionText.length + 2;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    hideAutocomplete();
  }
  
  // Hide autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!textarea.contains(e.target) && !autocomplete.contains(e.target)) {
      hideAutocomplete();
    }
  });
}

async function fetchJSON(url, options) {
  // Avoid cached 304 responses by adding a timestamp and disabling cache
  const cacheBuster = (url.includes('?') ? '&' : '?') + '_ts=' + Date.now();
  const token = getToken();
  
  // Merge headers properly - ensure Authorization is always included if token exists
  const defaultHeaders = {
    'Cache-Control': 'no-cache'
  };
  const customHeaders = (options && options.headers) ? options.headers : {};
  const headers = {
    ...defaultHeaders,
    ...customHeaders
  };
  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (!(options && options.body instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge options, but ensure headers are properly set
  const fetchOptions = {
    ...(options || {}),
    cache: 'no-store',
    headers
  };
  
  const res = await fetch(url + cacheBuster, fetchOptions);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Unauthorized - clear token and redirect to login
      clearUser();
      location.hash = '#auth';
      throw new Error('Authentication required');
    }
    // Surface status for easier debugging
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status}: ${body || res.statusText}`);
  }
  const shouldSkipJson = options && options.skipJson;
  if (shouldSkipJson) {
    return res;
  }
  return res.json();
}

// File compression function
async function compressFile(file) {
  // For images, use canvas compression
  if (file.type.startsWith('image/')) {
    return await compressImage(file);
  }
  
  // For other files, if still too large, return as-is (or implement other compression)
  // For now, we'll just return the file and let the backend handle it
  return file;
}

// Image compression function
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions to maintain aspect ratio
        const maxDimension = 1920; // Max width or height
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to get under 500KB
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= 500 * 1024 || quality <= 0.1) {
              // Create a new File object with the compressed blob
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, file.type, quality);
        };
        
        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let LOOKUPS = { users: [], departments: [] };
async function ensureLookups() {
  console.log('ensureLookups called, current LOOKUPS:', LOOKUPS);
  if (LOOKUPS.users.length && LOOKUPS.departments.length) return LOOKUPS;
  console.log('Fetching lookups from API...');
  LOOKUPS = await fetchJSON('/api/lookups');
  console.log('Lookups fetched:', LOOKUPS);
  return LOOKUPS;
}

function nameById(arr, id) {
  const m = arr.find(x => x.id === id);
  return m ? m.name : id || '';
}

function initiativeRow(i, crData = null, colVisibility = null) {
  const dep = nameById(LOOKUPS.departments, i.departmentId);
  const itpic = nameById(LOOKUPS.users, i.itPicId);
  const bo = nameById(LOOKUPS.users, i.businessOwnerId);
  const doc = i.documentationLink || '';
  const statusClass = i.status?.replace(/\s+/g, '-') || '';
  const priorityClass = i.priority || '';
  
  // Default visibility if not provided
  if (!colVisibility) colVisibility = getDefaultColumns('list');
  
  // CR Timeline display
  let crTimeline = '';
  if (i.type === 'CR' && crData) {
    const phases = [
      { name: 'CR Sec 1', start: crData.crSection1Start, end: crData.crSection1End },
      { name: 'CR Sec 2', start: crData.crSection2Start, end: crData.crSection2End },
      { name: 'CR Sec 3', start: crData.crSection3Start, end: crData.crSection3End },
      { name: 'Dev', start: crData.developmentStart, end: crData.developmentEnd },
      { name: 'SIT', start: crData.sitStart, end: crData.sitEnd },
      { name: 'UAT', start: crData.uatStart, end: crData.uatEnd },
      { name: 'Live', start: crData.liveStart, end: crData.liveEnd }
    ];
    
    const activePhases = phases.filter(p => p.start || p.end);
    if (activePhases.length > 0) {
      crTimeline = `<div style="font-size: 10px; line-height: 1.2;">
        ${activePhases.map(p => 
          `<div style="margin-bottom: 2px;">
            <strong>${p.name}:</strong> ${p.start || ''} - ${p.end || 'Ongoing'}
          </div>`
        ).join('')}
      </div>`;
    }
  }
  
  const timelineCell = i.type === 'CR' ? `<td class="col-timeline" style="display: ${colVisibility['col-timeline'] !== false ? 'table-cell' : 'none'}">${crTimeline}</td>` : '';
  
  return `<tr class="status-${statusClass}">
    <td class="col-ticket" style="display: ${colVisibility['col-ticket'] !== false ? 'table-cell' : 'none'}">${i.ticket || ''}</td>
    <td class="col-name" style="display: ${colVisibility['col-name'] !== false ? 'table-cell' : 'none'}"><strong><a href="#view/${i.id}">${i.name}</a></strong></td>
    <td class="col-priority" style="display: ${colVisibility['col-priority'] !== false ? 'table-cell' : 'none'}"><span class="priority-badge priority-${priorityClass}">${i.priority}</span></td>
    <td class="col-status" style="display: ${colVisibility['col-status'] !== false ? 'table-cell' : 'none'}"><span class="status-badge status-${statusClass}">${i.status}</span></td>
    <td class="col-milestone" style="display: ${colVisibility['col-milestone'] !== false ? 'table-cell' : 'none'}">${i.milestone}</td>
    <td class="col-department" style="display: ${colVisibility['col-department'] !== false ? 'table-cell' : 'none'}">${dep}</td>
    <td class="col-owner" style="display: ${colVisibility['col-owner'] !== false ? 'table-cell' : 'none'}">${bo}</td>
    <td class="col-pic" style="display: ${colVisibility['col-pic'] !== false ? 'table-cell' : 'none'}">${itpic}</td>
    <td class="col-date" style="display: ${colVisibility['col-date'] !== false ? 'table-cell' : 'none'}">${i.startDate?.slice(0,10) || ''}</td>
    <td class="col-date" style="display: ${colVisibility['col-date'] !== false ? 'table-cell' : 'none'}">${i.createdAt?.slice(0,10) || ''}</td>
    <td class="col-date" style="display: ${colVisibility['col-date'] !== false ? 'table-cell' : 'none'}">${i.endDate?.slice(0,10) || ''}</td>
    <td class="col-impact" style="display: ${colVisibility['col-impact'] !== false ? 'table-cell' : 'none'}" title="${i.businessImpact || ''}">${(i.businessImpact || '').toString().slice(0,100)}${(i.businessImpact || '').length > 100 ? '...' : ''}</td>
    <td class="col-remark" style="display: ${colVisibility['col-remark'] !== false ? 'table-cell' : 'none'}" title="${i.remark || ''}">${(i.remark || '').toString().slice(0,60)}${(i.remark || '').length > 60 ? '...' : ''}</td>
    <td class="col-doc" style="display: ${colVisibility['col-doc'] !== false ? 'table-cell' : 'none'}" title="${doc}">${doc.slice(0, 40)}${doc.length > 40 ? '...' : ''}</td>
    ${timelineCell}
    <td class="col-actions">
      <button data-id="${i.id}" class="view" style="margin-right: 8px;">View</button>
      <button data-id="${i.id}" class="edit" style="margin-right: 8px; color: var(--brand);">Edit</button>
      ${currentUser?.isAdmin ? `<button data-id="${i.id}" class="delete" style="color: var(--danger);">Delete</button>` : ''}
    </td>
  </tr>`;
}

async function renderList() {
  console.log('renderList called');
  setActive('#list');
  try {
    await ensureLookups();
    console.log('Lookups loaded successfully');
  } catch (error) {
    console.error('Error loading lookups:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  const urlParams = new URLSearchParams(location.search);
  const q = urlParams.get('q') || '';
  // Parse multi-value filters (comma-separated)
  const parseFilter = (key) => {
    const val = urlParams.get(key);
    return val ? val.split(',').filter(v => v) : [];
  };
  const filter = {
    departmentId: parseFilter('departmentId'),
    priority: parseFilter('priority'),
    status: parseFilter('status'),
    milestone: parseFilter('milestone')
  };
  const sortParam = urlParams.get('sort') || '';
  
  // Build API query string with multi-value filters
  const apiQs = new URLSearchParams();
  apiQs.set('type', 'Project'); // Only fetch Projects for Project List
  if (q) apiQs.set('q', q);
  if (filter.departmentId.length) apiQs.set('departmentId', filter.departmentId.join(','));
  if (filter.priority.length) apiQs.set('priority', filter.priority.join(','));
  if (filter.status.length) apiQs.set('status', filter.status.join(','));
  if (filter.milestone.length) apiQs.set('milestone', filter.milestone.join(','));
  
  console.log('Fetching data from API...');
  let data;
  try {
    data = await fetchJSON('/api/initiatives?' + apiQs.toString());
  } catch (e) {
    console.error('Failed to fetch initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load initiatives: ${e.message}</div>`;
    return;
  }
  
  // Calculate milestone counts from filtered data
  // Database stores: "Preparation", "Business Requirement", "Tech Assessment", "Planning", "Development", "Testing", "Live"
  const milestones = ['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'];
  const milestoneCounts = {};
  // Display names for the graph (same as database values)
  const milestoneDisplayNames = {
    'Preparation': 'Preparation',
    'Business Requirement': 'Business Requirement',
    'Tech Assessment': 'Tech Assessment',
    'Planning': 'Planning',
    'Development': 'Development',
    'Testing': 'Testing',
    'Live': 'Live'
  };
  // Milestone colors mapping
  const milestoneColors = {
    'Preparation': '#8b5cf6', // Purple
    'Business Requirement': '#3b82f6', // Blue
    'Tech Assessment': '#06b6d4', // Cyan
    'Planning': '#10b981', // Green
    'Development': '#f59e0b', // Amber
    'Testing': '#ef4444', // Red
    'Live': '#22c55e' // Green
  };
  milestones.forEach(m => milestoneCounts[m] = 0);
  data.forEach(i => {
    if (i.milestone && milestoneCounts.hasOwnProperty(i.milestone)) {
      milestoneCounts[i.milestone]++;
    }
  });
  console.log('Data fetched, count:', data.length);
  console.log('Sample data item:', data[0]);
  if (sortParam) {
    const [key, dir] = sortParam.split(':');
    const dirMul = dir === 'desc' ? -1 : 1;
    const nameFor = (keyName, id) => {
      if (keyName === 'departmentId') return nameById(LOOKUPS.departments, id);
      if (keyName === 'businessOwnerId' || keyName === 'itPicId') return nameById(LOOKUPS.users, id);
      return id || '';
    };
    data = data.slice().sort((a,b) => {
      let va, vb;
      if (key.endsWith('Id')) {
        va = nameFor(key, a[key]);
        vb = nameFor(key, b[key]);
      } else if (key === 'businessImpact' || key === 'remark' || key === 'documentationLink') {
        va = String(a[key] || '').toLowerCase();
        vb = String(b[key] || '').toLowerCase();
      } else {
        va = a[key] || '';
        vb = b[key] || '';
      }
      return String(va).localeCompare(String(vb)) * dirMul;
    });
  }
  
  // Get column visibility preferences
  const colVisibility = getColumnVisibility('list') || getDefaultColumns('list');
  
  // Column definitions
  const columns = [
    { key: 'ticket', class: 'col-ticket', label: 'Ticket', sortable: true },
    { key: 'name', class: 'col-name', label: 'Initiative Name', sortable: true },
    { key: 'priority', class: 'col-priority', label: 'Priority', sortable: true },
    { key: 'status', class: 'col-status', label: 'Status', sortable: true },
    { key: 'milestone', class: 'col-milestone', label: 'Milestone', sortable: true },
    { key: 'departmentId', class: 'col-department', label: 'Department', sortable: true },
    { key: 'businessOwnerId', class: 'col-owner', label: 'Business Owner', sortable: true },
    { key: 'itPicId', class: 'col-pic', label: 'IT PIC', sortable: true },
    { key: 'startDate', class: 'col-date', label: 'Start Date', sortable: true },
    { key: 'createdAt', class: 'col-date', label: 'Create Date', sortable: true },
    { key: 'endDate', class: 'col-date', label: 'End Date', sortable: true },
    { key: 'businessImpact', class: 'col-impact', label: 'Business Impact', sortable: true },
    { key: 'remark', class: 'col-remark', label: 'Remark', sortable: true },
    { key: 'documentationLink', class: 'col-doc', label: 'Project Doc Link', sortable: true },
    { key: 'actions', class: 'col-actions', label: 'Actions', sortable: false }
  ];
  
  // Helper to format activity log field labels
  const formatActivityFieldLabel = (field) => {
    if (!field) return '';
    // Friendly names for some known fields
    const mapping = {
      businessOwnerId: 'Business Owner / Requestor',
      businessUserIds: 'Business Users',
      departmentId: 'Department',
      itPicId: 'IT PIC',
      itPicIds: 'IT PIC',
      itPmId: 'IT PM',
      itManagerIds: 'IT Manager',
      startDate: 'Start Date',
      endDate: 'End Date',
      documentationLink: 'Project Doc Link'
    };
    if (mapping[field]) return mapping[field];
    return field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim();
  };

  // Helper to format activity log values (IDs -> names, etc.)
  const formatActivityValue = (field, raw) => {
    if (raw === null || raw === undefined || raw === '') return '(empty)';

    // For user single-value fields
    if (field === 'businessOwnerId' || field === 'itPicId' || field === 'itPmId' || field === 'changedBy') {
      const name = nameById(LOOKUPS.users, raw);
      return name || raw;
    }

    // For department
    if (field === 'departmentId') {
      const depName = nameById(LOOKUPS.departments, raw);
      return depName || raw;
    }

    // For multi-user fields stored as comma-separated IDs or JSON-like strings
    if (field === 'businessUserIds' || field === 'itPicIds' || field === 'itManagerIds') {
      let ids = [];
      if (Array.isArray(raw)) {
        ids = raw;
      } else {
        const str = String(raw).trim();
        // Try strict JSON parse first (handles '["id"]' cases)
        if (str.startsWith('[') && str.endsWith(']')) {
          try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
              ids = parsed;
            }
          } catch {
            // fall through to regex/split parsing
          }
        }
        // Fallback: strip brackets/quotes and split on commas
        if (ids.length === 0) {
          const cleaned = str.replace(/[\[\]"]/g, '');
          ids = cleaned.split(',').map(v => v.trim()).filter(Boolean);
        }
      }
      const names = ids.map(id => nameById(LOOKUPS.users, id)).filter(Boolean);
      return names.length > 0 ? names.join(', ') : (ids.length > 0 ? ids.join(', ') : String(raw));
    }

    // Default: plain string
    return String(raw);
  };

  app.innerHTML = `
    <div class="milestone-graph">
      <h3>Milestone Distribution</h3>
      <div class="milestone-flow">
        ${milestones.map((m, index) => {
          const count = milestoneCounts[m] || 0;
          const isLast = index === milestones.length - 1;
          const displayName = milestoneDisplayNames[m] || m;
          const color = milestoneColors[m] || 'var(--brand)';
          return `
            <div class="milestone-step">
              <div class="milestone-circle ${count > 0 ? 'active' : ''}" style="${count > 0 ? `border-color: ${color}; background: linear-gradient(135deg, ${color}15 0%, ${color}25 100%);` : ''}">
                <div class="milestone-name">${displayName}</div>
                <div class="milestone-count-badge" style="background: ${count > 0 ? color : 'var(--muted)'}">${count}</div>
              </div>
              ${!isLast ? '<div class="milestone-arrow">→</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-row">
        <div class="search-group">
          <input id="search" placeholder="Search by name, ticket..." value="${q}">
          <button id="doSearch">Search</button>
        </div>
        <div class="filter-group">
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fDepartment">
              Department ${filter.departmentId.length > 0 ? `(${filter.departmentId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fDepartment">
              ${LOOKUPS.departments.map(d => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${d.id}" ${filter.departmentId.includes(d.id) ? 'checked' : ''}>
                  ${d.name}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fPriority">
              Priority ${filter.priority.length > 0 ? `(${filter.priority.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fPriority">
              ${['P0','P1','P2'].map(p => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${p}" ${filter.priority.includes(p) ? 'checked' : ''}>
                  ${p}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fStatus">
              Status ${filter.status.length > 0 ? `(${filter.status.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fStatus">
              ${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${s}" ${filter.status.includes(s) ? 'checked' : ''}>
                  ${s}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fMilestone">
              Milestone ${filter.milestone.length > 0 ? `(${filter.milestone.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fMilestone">
              ${milestones.map(m => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${m}" ${filter.milestone.includes(m) ? 'checked' : ''}>
                  ${milestoneDisplayNames[m] || m}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="action-group">
          <button id="btn-columns" onclick="showColumnSettings('list')" title="Column Settings" class="icon-btn">⚙️</button>
          <a href="#new"><button class="primary">+ New Initiative</button></a>
        </div>
      </div>
    </div>
    <table id="initiatives-table">
      <thead>
        <tr>
          ${columns.map(col => {
            const visible = colVisibility[col.class] !== false;
            const sortClass = col.sortable ? 'sortable' : '';
            const sortIndicator = sortParam && sortParam.startsWith(`${col.key}:`) ? (sortParam.includes(':desc') ? ' ↓' : ' ↑') : '';
            return `<th class="${sortClass} ${col.class}" data-key="${col.key}" data-col="${col.class}" style="display: ${visible ? 'table-cell' : 'none'}">${col.label}${sortIndicator}</th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>${data.map(i => initiativeRow(i, null, colVisibility)).join('')}</tbody>
    </table>
    <div id="column-settings-modal" class="modal hidden">
      <div class="modal-content column-settings-modal">
        <h3 class="modal-title">Column Visibility</h3>
        <div class="modal-checkbox-controls">
          <button class="btn-link" onclick="checkAllColumns('list')">Check All</button>
          <span class="control-separator">|</span>
          <button class="btn-link" onclick="uncheckAllColumns('list')">Uncheck All</button>
        </div>
        <div id="column-checkboxes" class="column-checkboxes-grid">
          ${columns.filter(c => c.key !== 'actions').map(col => `
            <label class="column-checkbox-label">
              <input type="checkbox" data-col="${col.class}" ${colVisibility[col.class] !== false ? 'checked' : ''} class="column-checkbox">
              <span class="column-checkbox-text">${col.label}</span>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeColumnSettings()">Cancel</button>
          <button class="btn-primary" onclick="saveColumnSettings('list')">Save View</button>
        </div>
      </div>
    </div>
  `;
  // Multi-select dropdown handlers
  document.querySelectorAll('.multi-select-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const filterId = btn.dataset.filter;
      const dropdown = document.getElementById(`dropdown-${filterId}`);
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
      }
    };
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select-wrapper')) {
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
    }
  });
  
  // Checkbox change handlers
  document.querySelectorAll('.multi-select-option input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => {
      applyFilters();
    };
  });
  
  function applyFilters() {
    const searchVal = document.getElementById('search').value;
    const url = new URL(location.href);
    
    // Update search
    if (searchVal) url.searchParams.set('q', searchVal);
    else url.searchParams.delete('q');
    
    // Get selected values from each multi-select
    const getSelectedValues = (filterId) => {
      const checkboxes = document.querySelectorAll(`#dropdown-${filterId} input[type="checkbox"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    };
    
    const filterMap = {
      'fDepartment': 'departmentId',
      'fPriority': 'priority',
      'fStatus': 'status',
      'fMilestone': 'milestone'
    };
    
    Object.entries(filterMap).forEach(([filterId, paramKey]) => {
      const values = getSelectedValues(filterId);
      if (values.length > 0) {
        url.searchParams.set(paramKey, values.join(','));
      } else {
        url.searchParams.delete(paramKey);
      }
    });
    
    history.pushState({}, '', url);
    renderList();
  }
  
  document.getElementById('doSearch').onclick = () => {
    applyFilters();
  };
  
  // Enter key on search input
  document.getElementById('search').onkeypress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };
  // Column settings functions
  window.showColumnSettings = (viewType) => {
    const modalId = viewType === 'crlist' ? 'column-settings-modal-cr' : 'column-settings-modal';
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  };
  
  window.saveColumnSettings = (viewType) => {
    const checkboxId = viewType === 'crlist' ? '#column-checkboxes-cr' : '#column-checkboxes';
    const checkboxes = document.querySelectorAll(`${checkboxId} input[type="checkbox"]`);
    const visibility = {};
    checkboxes.forEach(cb => {
      visibility[cb.dataset.col] = cb.checked;
    });
    // Always keep actions visible
    visibility['col-actions'] = true;
    saveColumnVisibility(viewType, visibility);
    closeColumnSettings();
    if (viewType === 'list') {
      renderList();
    } else if (viewType === 'crlist') {
      renderCRList();
    }
  };
  
  window.closeColumnSettings = () => {
    const modal = document.getElementById('column-settings-modal');
    const modalCr = document.getElementById('column-settings-modal-cr');
    if (modal) modal.classList.add('hidden');
    if (modalCr) modalCr.classList.add('hidden');
  };
  
  window.checkAllColumns = (viewType) => {
    const checkboxId = viewType === 'crlist' ? '#column-checkboxes-cr' : '#column-checkboxes';
    const checkboxes = document.querySelectorAll(`${checkboxId} input[type="checkbox"]`);
    checkboxes.forEach(cb => {
      cb.checked = true;
    });
  };
  
  window.uncheckAllColumns = (viewType) => {
    const checkboxId = viewType === 'crlist' ? '#column-checkboxes-cr' : '#column-checkboxes';
    const checkboxes = document.querySelectorAll(`${checkboxId} input[type="checkbox"]`);
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
  };
  
  // Close modal when clicking backdrop
  setTimeout(() => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeColumnSettings();
        }
      });
    });
  }, 100);
  
  // Sorting
  document.querySelectorAll('thead th.sortable').forEach(th => {
    const resizer = document.createElement('span');
    resizer.className = 'col-resize';
    th.appendChild(resizer);
    th.onclick = (e) => {
      if (e.target === resizer) return; // ignore when resizing
      const key = th.dataset.key;
      const url = new URL(location.href);
      const current = url.searchParams.get('sort') || '';
      const [curKey, curDir] = current.split(':');
      const nextDir = curKey === key && curDir === 'asc' ? 'desc' : 'asc';
      url.searchParams.set('sort', `${key}:${nextDir}`);
      history.pushState({}, '', url);
      renderList();
    };
    // Resize behavior
    let startX = 0; let startWidth = 0;
    resizer.onmousedown = (ev) => {
      startX = ev.clientX;
      startWidth = th.offsetWidth;
      document.onmousemove = (mv) => {
        const dx = mv.clientX - startX;
        th.style.width = Math.max(80, startWidth + dx) + 'px';
      };
      document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
    };
  });
  document.querySelectorAll('button.delete').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this initiative?')) return;
      await fetch(`/api/initiatives/${btn.dataset.id}`, { method: 'DELETE' });
      renderList();
    };
  });
  document.querySelectorAll('button.view').forEach(btn => {
    btn.onclick = () => location.hash = `#view/${btn.dataset.id}`;
  });
  document.querySelectorAll('button.edit').forEach(btn => {
    btn.onclick = () => location.hash = `#edit/${btn.dataset.id}`;
  });
}

function formRow(label, inputHtml) {
  return `<div class="form-row"><label>${label}</label><div>${inputHtml}</div></div>`;
}

// Helper function to create multi-select dropdown for forms
function createMultiSelect(name, options, selectedValues = []) {
  const selectedSet = new Set(Array.isArray(selectedValues) ? selectedValues : [selectedValues].filter(Boolean));
  const selectedIds = Array.from(selectedSet);
  
  return `
    <div class="multi-select-wrapper">
      <button type="button" class="multi-select-btn" data-field="${name}">
        ${selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select...'}
      </button>
      <div class="multi-select-dropdown" id="dropdown-${name}">
        ${options.map(opt => `
          <label class="multi-select-option">
            <input type="checkbox" value="${opt.id}" ${selectedSet.has(opt.id) ? 'checked' : ''} data-field="${name}">
            ${opt.name}
          </label>
        `).join('')}
      </div>
      <input type="hidden" name="${name}" value="${selectedIds.join(',')}">
    </div>
  `;
}

// Initialize multi-select dropdowns in forms
function initializeMultiSelects() {
  document.querySelectorAll('.multi-select-btn[data-field]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const fieldName = btn.dataset.field;
      const dropdown = document.getElementById(`dropdown-${fieldName}`);
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
      }
    };
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select-wrapper')) {
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
    }
  });
  
  // Update hidden input when checkboxes change
  document.querySelectorAll('.multi-select-option input[type="checkbox"][data-field]').forEach(cb => {
    cb.onchange = () => {
      const fieldName = cb.dataset.field;
      const checkboxes = document.querySelectorAll(`#dropdown-${fieldName} input[type="checkbox"]:checked`);
      const selectedValues = Array.from(checkboxes).map(c => c.value);
      const hiddenInput = document.querySelector(`input[type="hidden"][name="${fieldName}"]`);
      if (hiddenInput) {
        hiddenInput.value = selectedValues.join(',');
      }
      
      // Update button text
      const btn = document.querySelector(`.multi-select-btn[data-field="${fieldName}"]`);
      if (btn) {
        btn.textContent = selectedValues.length > 0 ? `${selectedValues.length} selected` : 'Select...';
      }
    };
  });
}

function commonFields(initiative = null) {
  const option = (value, label, selected) => `<option value="${value}" ${selected ? 'selected' : ''}>${label}</option>`;
  
  return [
    formRow('Type', `<select name="type" required><option value="Project" ${!initiative || initiative.type === 'Project' ? 'selected' : ''}>Project</option><option value="CR" ${initiative && initiative.type === 'CR' ? 'selected' : ''}>CR</option></select>`),
    formRow('Initiative Name', `<input name="name" value="${initiative ? (initiative.name || '').replace(/"/g, '&quot;') : ''}" required />`),
    formRow('Description', `<textarea name="description" class="long-text" required>${initiative ? (initiative.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>`),
    formRow('Business Impact', `<textarea name="businessImpact" class="long-text" required>${initiative ? (initiative.businessImpact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>`),
    formRow('Priority', `<select name="priority">${option('P0', 'P0', initiative?.priority === 'P0')}${option('P1', 'P1', initiative?.priority === 'P1')}${option('P2', 'P2', !initiative || initiative.priority === 'P2')}</select>`),
    formRow('Business Owner / Requestor', `<select name="businessOwnerId" required>${LOOKUPS.users.map(u => option(u.id, u.name, initiative?.businessOwnerId === u.id)).join('')}</select>`),
    formRow('Business Users', createMultiSelect('businessUserIds', LOOKUPS.users, initiative?.businessUserIds || [])),
    formRow('Department', `<select name="departmentId" required>${LOOKUPS.departments.map(d => option(d.id, d.name, initiative?.departmentId === d.id)).join('')}</select>`),
    formRow('IT PIC', createMultiSelect('itPicIds', LOOKUPS.users, initiative?.itPicIds || (initiative?.itPicId ? [initiative.itPicId] : []))),
    formRow('IT PM', `<select name="itPmId">${option('', 'None', !initiative?.itPmId)}${LOOKUPS.users.map(u => option(u.id, u.name, initiative?.itPmId === u.id)).join('')}</select>`),
    formRow('IT Manager', createMultiSelect('itManagerIds', LOOKUPS.users, initiative?.itManagerIds || [])),
    formRow('Status', `<select name="status">${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s => option(s, s, initiative?.status === s)).join('')}</select>`),
    formRow('Milestone', `<select name="milestone">${['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'].map(m => option(m, m, initiative?.milestone === m)).join('')}</select>`),
    formRow('Start Date', `<input type="date" name="startDate" value="${initiative?.startDate?.slice(0,10) || ''}" required />`),
    formRow('End Date', `<input type="date" name="endDate" value="${initiative?.endDate?.slice(0,10) || ''}" />`),
    formRow('Remark', `<textarea name="remark" class="long-text">${initiative ? (initiative.remark || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>`),
    formRow('Project Doc Link', `<input name="documentationLink" type="url" value="${initiative?.documentationLink || ''}" />`)
  ].join('');
}

function crFields() {
  return `
    <div id="crFields">
      ${formRow('CR Submission Start', `<input type="date" name="cr.crSubmissionStart" />`)}
      ${formRow('CR Submission End', `<input type="date" name="cr.crSubmissionEnd" />`)}
      ${formRow('Development Start', `<input type="date" name="cr.developmentStart" />`)}
      ${formRow('Development End', `<input type="date" name="cr.developmentEnd" />`)}
      ${formRow('SIT Start', `<input type="date" name="cr.sitStart" />`)}
      ${formRow('SIT End', `<input type="date" name="cr.sitEnd" />`)}
      ${formRow('UAT Start', `<input type="date" name="cr.uatStart" />`)}
      ${formRow('UAT End', `<input type="date" name="cr.uatEnd" />`)}
      ${formRow('Live Date', `<input type="date" name="cr.liveDate" />`)}
    </div>`;
}

async function renderNew() {
  setActive('#new');
  await ensureLookups();
  app.innerHTML = `
    <div class="card">
      <h2>New Initiative</h2>
      <form id="f" class="form">
        ${commonFields()}
        <div id="crContainer" class="card" style="display:none">
          <h3>CR Details</h3>
          ${crFields()}
        </div>
        <div>
          <button class="primary" type="submit">Create</button>
          <a href="#list"><button type="button">Cancel</button></a>
        </div>
      </form>
      <div class="muted">Note: For CR, CR Submission Start is required.</div>
    </div>
  `;
  
  // Initialize multi-select dropdowns
  initializeMultiSelects();
  
  const f = document.getElementById('f');
  const typeEl = f.querySelector('select[name="type"]');
  const crBox = document.getElementById('crContainer');
  typeEl.onchange = () => {
    crBox.style.display = typeEl.value === 'CR' ? 'block' : 'none';
  };
  typeEl.onchange();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const obj = Object.fromEntries(fd.entries());
    
    // Parse comma-separated arrays
    const businessUserIds = obj.businessUserIds ? obj.businessUserIds.split(',').filter(Boolean) : [];
    const itPicIds = obj.itPicIds ? obj.itPicIds.split(',').filter(Boolean) : [];
    const itManagerIds = obj.itManagerIds ? obj.itManagerIds.split(',').filter(Boolean) : [];
    
    const payload = {
      type: obj.type,
      name: obj.name,
      description: obj.description,
      businessImpact: obj.businessImpact,
      priority: obj.priority,
      businessOwnerId: obj.businessOwnerId,
      businessUserIds: businessUserIds.length > 0 ? businessUserIds : null,
      departmentId: obj.departmentId,
      itPicIds: itPicIds.length > 0 ? itPicIds : null,
      itPmId: obj.itPmId || null,
      itManagerIds: itManagerIds.length > 0 ? itManagerIds : null,
      status: obj.status,
      milestone: obj.milestone,
      startDate: obj.startDate,
      endDate: obj.endDate || null,
      remark: obj.remark || null,
      documentationLink: obj.documentationLink || null
    };
    if (obj.type === 'CR') {
      payload.cr = {
        crSubmissionStart: obj['cr.crSubmissionStart'] || null,
        crSubmissionEnd: obj['cr.crSubmissionEnd'] || null,
        developmentStart: obj['cr.developmentStart'] || null,
        developmentEnd: obj['cr.developmentEnd'] || null,
        sitStart: obj['cr.sitStart'] || null,
        sitEnd: obj['cr.sitEnd'] || null,
        uatStart: obj['cr.uatStart'] || null,
        uatEnd: obj['cr.uatEnd'] || null,
        liveDate: obj['cr.liveDate'] || null
      };
    }
    try {
      await fetchJSON('/api/initiatives', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      location.hash = '#list';
      renderList();
    } catch (e) {
      alert(e.message);
    }
  };
}

async function renderView(id) {
  setActive('#list');
  await ensureLookups();
  await getCurrentUser();
  const i = await fetchJSON('/api/initiatives/' + id);
  const boName = nameById(LOOKUPS.users, i.businessOwnerId);
  const depName = nameById(LOOKUPS.departments, i.departmentId);
  const itPicName = nameById(LOOKUPS.users, i.itPicId);
  const itPicNames = (i.itPicIds || []).map(id => nameById(LOOKUPS.users, id)).filter(Boolean).join(', ') || itPicName || 'N/A';
  const businessUserNames = (i.businessUserIds || []).map(id => nameById(LOOKUPS.users, id)).filter(Boolean).join(', ') || 'None';
  const itPmName = i.itPmId ? nameById(LOOKUPS.users, i.itPmId) : 'None';
  const itManagerNames = (i.itManagerIds || []).map(id => nameById(LOOKUPS.users, id)).filter(Boolean).join(', ') || 'None';
  
  // Fetch comments and tasks
  let comments = [];
  let tasks = [];
  try {
    comments = await fetchJSON(`/api/comments/initiative/${id}`);
    tasks = await fetchJSON(`/api/tasks/initiative/${id}`);
  } catch (e) {
    console.error('Error fetching comments/tasks:', e);
  }

  // Calculate % Completion based on task statuses (fallback to initiative status when no tasks)
  const statusToPercent = {
    'Not Started': 0,
    'On Hold': 0,
    'On Track': 50,
    'At Risk': 25,
    'Delayed': 10,
    'Live': 100,
    'Cancelled': 100
  };
  const getPercentForStatus = (status) => statusToPercent[status] ?? 0;
  const completionPercent = (() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      const total = tasks.reduce((sum, t) => sum + getPercentForStatus(t.status || 'Not Started'), 0);
      return Math.round(total / tasks.length);
    }
    return getPercentForStatus(i.status || 'Not Started');
  })();
  
  // Calculate aging
  const createDate = new Date(i.createdAt || i.startDate);
  const now = new Date();
  const daysSinceCreated = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
  
  // Helper to format activity log field labels
  const formatActivityFieldLabel = (field) => {
    if (!field) return '';
    const mapping = {
      businessOwnerId: 'Business Owner / Requestor',
      businessUserIds: 'Business Users',
      departmentId: 'Department',
      itPicId: 'IT PIC',
      itPicIds: 'IT PIC',
      itPmId: 'IT PM',
      itManagerIds: 'IT Manager',
      startDate: 'Start Date',
      endDate: 'End Date',
      documentationLink: 'Project Doc Link'
    };
    if (mapping[field]) return mapping[field];
    return field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim();
  };

  // Helper to format activity log values (IDs -> names, etc.)
  const formatActivityValue = (field, raw) => {
    if (raw === null || raw === undefined || raw === '') return '(empty)';

    // Single user ID fields
    if (field === 'businessOwnerId' || field === 'itPicId' || field === 'itPmId' || field === 'changedBy') {
      const name = nameById(LOOKUPS.users, raw);
      return name || String(raw);
    }

    // Department
    if (field === 'departmentId') {
      const depName = nameById(LOOKUPS.departments, raw);
      return depName || String(raw);
    }

    // Multi-user ID fields
    if (field === 'businessUserIds' || field === 'itPicIds' || field === 'itManagerIds') {
      let ids = [];
      if (Array.isArray(raw)) {
        ids = raw;
      } else {
        const str = String(raw).trim();
        
        // Try strict JSON parse first (handles '["id"]' cases)
        if (str.startsWith('[') && str.endsWith(']')) {
          try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
              ids = parsed;
            }
          } catch {
            // fall through to regex/split parsing
          }
        }
        
        // If still no IDs, strip all brackets/quotes/braces and check format
        if (ids.length === 0) {
          // Strip curly braces, square brackets, and double quotes
          const cleaned = str.replace(/[{}[\]"]/g, '').trim();
          
          // Check if it's a single UUID (no commas) or comma-separated
          if (cleaned && !cleaned.includes(',')) {
            // Single UUID (could be wrapped in quotes/braces originally)
            ids = [cleaned];
          } else if (cleaned) {
            // Comma-separated IDs
            ids = cleaned.split(',').map(v => v.trim()).filter(Boolean);
          }
        }
      }
      
      // Look up names for all IDs, stripping any remaining quotes/braces
      const names = ids.map(id => {
        const cleanId = String(id).replace(/[{}[\]"]/g, '').trim();
        // Try cleaned ID first
        let name = nameById(LOOKUPS.users, cleanId);
        // If not found, try original ID (in case cleaning removed something important)
        if (!name && cleanId !== String(id).trim()) {
          name = nameById(LOOKUPS.users, String(id).trim());
        }
        return name;
      }).filter(Boolean);
      
      if (names.length > 0) return names.join(', ');
      // Fallback: return cleaned IDs if no names found
      if (ids.length > 0) {
        const cleanedIds = ids.map(id => String(id).replace(/[{}[\]"]/g, '').trim()).filter(Boolean);
        return cleanedIds.join(', ');
      }
      return String(raw);
    }

    return String(raw);
  };

  app.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">${i.name}</h2>
        <button id="toggle-edit-btn" class="primary">✏️ Edit</button>
      </div>
      <div class="grid" id="view-content">
        <div><div class="muted">Ticket</div><div>${i.ticket || i.id}</div></div>
        <div><div class="muted">Type</div><div>${i.type}</div></div>
        <div><div class="muted">Create Date</div><div>${i.createdAt?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Priority</div><div><span class="priority-badge priority-${i.priority}">${i.priority}</span></div></div>
        <div><div class="muted">Status</div><div><span class="status-badge status-${i.status?.replace(/\s+/g, '-')}">${i.status}</span></div></div>
        <div><div class="muted">% Completion</div><div><strong>${completionPercent}%</strong></div></div>
        <div><div class="muted">Milestone</div><div>${i.milestone}</div></div>
        <div><div class="muted">Department</div><div>${depName}</div></div>
        <div><div class="muted">Start Date</div><div>${i.startDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">End Date</div><div>${i.endDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Age Since Created</div><div><strong>${daysSinceCreated} days</strong></div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Description</div><div style="white-space: pre-wrap; line-height: 1.6;">${i.description || ''}</div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Business Impact</div><div style="white-space: pre-wrap; line-height: 1.6;">${i.businessImpact || ''}</div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Remark</div><div style="white-space: pre-wrap; line-height: 1.6;">${i.remark || ''}</div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Project Doc Link</div><div>${i.documentationLink ? `<a href="${i.documentationLink}" target="_blank">${i.documentationLink}</a>` : ''}</div></div>
      </div>
      
      <!-- Project Team Section -->
      <div style="grid-column: 1 / -1; margin-top: 24px; padding: 20px; background: var(--gray-50); border-radius: 8px;">
        <h3 style="margin: 0 0 16px 0; color: var(--text);">👥 Project Team</h3>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          <div><div class="muted">IT PM</div><div style="font-weight: 500;">${itPmName}</div></div>
          <div><div class="muted">IT PIC</div><div style="font-weight: 500;">${itPicNames}</div></div>
          <div><div class="muted">IT Manager</div><div style="font-weight: 500;">${itManagerNames}</div></div>
          <div><div class="muted">Business Owner / Requestor</div><div style="font-weight: 500;">${boName}</div></div>
          <div><div class="muted">Business Users</div><div style="font-weight: 500;">${businessUserNames}</div></div>
        </div>
      </div>
      
      <!-- Documents Section -->
      <div style="grid-column: 1 / -1; margin-top: 24px;">
        <h3>Documents</h3>
        <div id="documents-list" style="margin-bottom: 16px;">
          ${i.documents && i.documents.length > 0 ? i.documents.map(doc => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--gray-50); border-radius: 8px; margin-bottom: 8px;">
              <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">${doc.fileName}</div>
                <div style="font-size: 12px; color: var(--muted);">
                  ${(doc.sizeBytes / 1024).toFixed(2)} KB • Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <button class="download-document-btn" data-id="${doc.id}" style="margin-right: 8px;">Download</button>
                ${currentUser && (currentUser.isAdmin || doc.uploadedBy === currentUser.id) ? `
                  <button class="delete-document-btn" data-id="${doc.id}" style="color: var(--danger);">Delete</button>
                ` : ''}
              </div>
            </div>
          `).join('') : '<p class="muted">No documents uploaded yet.</p>'}
        </div>
        <div>
          <input type="file" id="document-upload" multiple accept="*/*" style="margin-bottom: 8px; width: 100%;">
          <button id="upload-documents-btn" class="primary">Upload Documents</button>
          <div id="upload-progress" style="margin-top: 8px; display: none;">
            <div style="font-size: 12px; color: var(--muted);">Uploading...</div>
            <div style="width: 100%; height: 4px; background: var(--gray-200); border-radius: 2px; margin-top: 4px;">
              <div id="upload-progress-bar" style="height: 100%; background: var(--brand); width: 0%; transition: width 0.3s;"></div>
            </div>
          </div>
        </div>
      </div>
      
      ${i.type === 'CR' ? `
        <h3>CR Dates</h3>
        <div class="grid">
          <div><div class="muted">Submission</div><div>${i.cr?.crSubmissionStart || ''} → ${i.cr?.crSubmissionEnd || ''}</div></div>
          <div><div class="muted">Development</div><div>${i.cr?.developmentStart || ''} → ${i.cr?.developmentEnd || ''}</div></div>
          <div><div class="muted">SIT</div><div>${i.cr?.sitStart || ''} → ${i.cr?.sitEnd || ''}</div></div>
          <div><div class="muted">UAT</div><div>${i.cr?.uatStart || ''} → ${i.cr?.uatEnd || ''}</div></div>
          <div><div class="muted">Live</div><div>${i.cr?.liveDate || ''}</div></div>
        </div>
      ` : ''}
      <!-- Activity Log Section -->
      <div style="grid-column: 1 / -1; margin-top: 24px;">
        <h3>📋 Activity Log</h3>
        <div class="card" style="margin-top: 16px; max-height: 600px; overflow-y: auto;">
          ${i.changeHistory && i.changeHistory.length > 0 ? `
            ${i.changeHistory.map((history, idx) => {
              const changedByName = nameById(LOOKUPS.users, history.changedBy) || history.changedBy || 'System';
              const timestamp = new Date(history.timestamp);
              const formattedDate = timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              return `
                <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: ${idx < i.changeHistory.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div style="width: 8px; height: 8px; background: var(--brand); border-radius: 50%; margin-right: 12px;"></div>
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: var(--text); margin-bottom: 4px;">${changedByName}</div>
                      <div class="muted" style="font-size: 12px;">${formattedDate} at ${formattedTime}</div>
                    </div>
                  </div>
              ${history.changes && history.changes.length > 0 ? `
                    <div style="margin-left: 20px; padding-left: 16px; border-left: 2px solid var(--border-light);">
                      ${history.changes.map(change => {
                        const fieldLabel = formatActivityFieldLabel(change.field);
                        const oldFormatted = formatActivityValue(change.field, change.oldValue);
                        const newFormatted = formatActivityValue(change.field, change.newValue);
                        return `
                          <div style="margin: 8px 0; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 3px solid var(--brand);">
                            <div style="font-weight: 600; color: var(--text); margin-bottom: 6px;">${fieldLabel}</div>
                            <div style="font-size: 13px; line-height: 1.6;">
                              <span style="color: #ef4444; text-decoration: line-through; padding: 2px 6px; background: #fee2e2; border-radius: 3px;">${oldFormatted}</span>
                              <span style="margin: 0 8px; color: var(--muted);">→</span>
                              <span style="color: #10b981; padding: 2px 6px; background: #d1fae5; border-radius: 3px;">${newFormatted}</span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `
                    <div style="margin-left: 20px; padding: 8px; color: var(--muted); font-size: 13px; font-style: italic;">
                      No specific field changes recorded
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          ` : `
            <div style="padding: 40px; text-align: center; color: var(--muted);">
              <div style="font-size: 48px; margin-bottom: 12px;">📝</div>
              <div style="font-weight: 500; margin-bottom: 4px;">No activity recorded yet</div>
              <div style="font-size: 13px;">Changes to this initiative will appear here</div>
            </div>
          `}
        </div>
      </div>
      <div style="margin-top:12px"><a href="#list"><button>Back</button></a></div>
    </div>
    
    
    <!-- Comments Section -->
    <div class="card" style="margin-top: 24px;">
      <h3>Comments</h3>
      <div id="comments-list" style="margin-bottom: 16px;">
        ${comments.length === 0 ? '<p class="muted">No comments yet. Be the first to comment!</p>' : ''}
        ${comments.map(c => {
          const author = nameById(LOOKUPS.users, c.authorId) || 'Unknown';
          const canEdit = currentUser && (c.authorId === currentUser.id || currentUser.isAdmin);
          return `
            <div class="comment-item" style="margin-bottom: 16px; padding: 12px; background: var(--gray-50); border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div>
                  <strong>${author}</strong>
                  <span class="muted" style="font-size: 12px; margin-left: 8px;">${c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                  ${c.updatedAt ? `<span class="muted" style="font-size: 11px; margin-left: 8px;">(edited)</span>` : ''}
                </div>
                ${canEdit ? `
                  <div>
                    <button class="edit-comment-btn" data-id="${c.id}" style="font-size: 12px; padding: 4px 8px; margin-right: 4px;">Edit</button>
                    <button class="delete-comment-btn" data-id="${c.id}" style="font-size: 12px; padding: 4px 8px; color: var(--danger);">Delete</button>
                  </div>
                ` : ''}
              </div>
              <div class="comment-body">${formatCommentBody(c.body || '')}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div>
        <div style="position: relative;">
          <textarea id="new-comment" placeholder="Add a comment... (use @username to mention someone)" rows="3" style="width: 100%; margin-bottom: 8px;"></textarea>
          <div id="mention-autocomplete" class="mention-autocomplete hidden"></div>
        </div>
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
          💡 Tip: Type @ followed by a username to mention someone
        </div>
        <button id="add-comment-btn" class="primary">Add Comment</button>
      </div>
    </div>
    
    <!-- Tasks Section -->
    <div class="card" style="margin-top: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0;">Tasks</h3>
        <div>
          <button id="new-task-btn" class="primary" style="margin-right: 8px;">+ New Task</button>
          <button id="download-task-template-btn" style="margin-right: 8px;">📥 Download Template</button>
          <button id="upload-tasks-btn" style="margin-right: 8px;">📤 Upload Tasks</button>
          <button id="task-view-list" class="task-view-btn active" data-view="list">📋 List</button>
          <button id="task-view-kanban" class="task-view-btn" data-view="kanban">📊 Kanban</button>
          <button id="task-view-gantt" class="task-view-btn" data-view="gantt">📅 Gantt</button>
        </div>
      </div>
      
      <!-- Task List View -->
      <div id="tasks-list-view" class="task-view">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Name</th>
              <th>Milestone</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.length === 0 ? '<tr><td colspan="7" class="muted" style="text-align: center; padding: 20px;">No tasks yet</td></tr>' : ''}
            ${tasks.map(t => {
              const assignee = nameById(LOOKUPS.users, t.assigneeId) || 'Unassigned';
              return `
                <tr>
                  <td><strong>${t.name}</strong>${t.description ? `<br><small class="muted">${t.description}</small>` : ''}</td>
                  <td>${t.milestone || '-'}</td>
                  <td>${assignee}</td>
                  <td><span class="status-badge status-${(t.status || 'Not Started')?.replace(/\s+/g, '-')}">${t.status || 'Not Started'}</span></td>
                  <td>${t.startDate ? t.startDate.slice(0,10) : '-'}</td>
                  <td>${t.endDate ? t.endDate.slice(0,10) : '-'}</td>
                  <td>
                    <button class="edit-task-btn" data-id="${t.id}" style="margin-right: 4px;">Edit</button>
                    <button class="delete-task-btn" data-id="${t.id}" style="color: var(--danger);">Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Task Kanban View -->
      <div id="tasks-kanban-view" class="task-view hidden">
        <div class="kanban-board" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          ${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(status => {
            const statusTasks = tasks.filter(t => (t.status || 'Not Started') === status);
            return `
              <div class="kanban-column" data-status="${status}" style="background: var(--gray-50); border-radius: 8px; padding: 12px; min-height: 200px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">${status} (${statusTasks.length})</h4>
                <div class="kanban-tasks" data-status="${status}">
                  ${statusTasks.map(t => {
                    const assignee = nameById(LOOKUPS.users, t.assigneeId) || 'Unassigned';
                    return `
                      <div class="kanban-task" draggable="true" data-id="${t.id}" data-status="${t.status || 'Not Started'}" style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 6px; cursor: move; box-shadow: var(--shadow);">
                        <div style="font-weight: 600; margin-bottom: 4px;">${t.name}</div>
                        ${t.description ? `<div class="muted" style="font-size: 12px; margin-bottom: 4px;">${t.description}</div>` : ''}
                        <div style="font-size: 11px; color: var(--muted);">
                          <div>👤 ${assignee}</div>
                          ${t.milestone ? `<div>📍 ${t.milestone}</div>` : ''}
                          ${t.startDate || t.endDate ? `<div>📅 ${t.startDate ? t.startDate.slice(0,10) : ''} ${t.endDate ? '→ ' + t.endDate.slice(0,10) : ''}</div>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <!-- Task Gantt Chart View -->
      <div id="tasks-gantt-view" class="task-view hidden">
        <div id="gantt-container" style="overflow-x: auto; overflow-y: auto; max-height: 70vh; border: 1px solid var(--border); border-radius: 8px; background: white;">
          <div id="gantt-chart" style="min-width: 100%; padding: 16px;">
            <!-- Gantt chart will be rendered here -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Event handlers for documents
  document.getElementById('upload-documents-btn').onclick = async () => {
    const fileInput = document.getElementById('document-upload');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }
    
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    progressDiv.style.display = 'block';
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progressBar.style.width = `${((i + 1) / files.length) * 100}%`;
        
        // Compress file if larger than 500KB
        let fileToUpload = file;
        if (file.size > 500 * 1024) {
          fileToUpload = await compressFile(file);
        }
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('initiativeId', id);
        
        await fetchJSON('/api/documents', {
          method: 'POST',
          body: formData,
          skipJson: true // Skip JSON parsing for file upload
        });
      }
      
      fileInput.value = '';
      progressDiv.style.display = 'none';
      progressBar.style.width = '0%';
      renderView(id);
    } catch (error) {
      alert('Failed to upload documents: ' + error.message);
      progressDiv.style.display = 'none';
      progressBar.style.width = '0%';
    }
  };
  
  document.querySelectorAll('.download-document-btn').forEach(btn => {
    btn.onclick = async () => {
      const docId = btn.dataset.id;
      const token = getToken();
      if (!token) {
        alert('Authentication required');
        return;
      }
      
      try {
        const res = await fetchJSON(`/api/documents/${docId}/download`, {
          method: 'GET',
          skipJson: true
        });
        
        if (!res.ok) {
          throw new Error(`Download failed: ${res.status}`);
        }
        
        // Get the filename from Content-Disposition header or use a default
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = 'document';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
      } catch (error) {
        alert('Failed to download document: ' + error.message);
      }
    };
  });
  
  document.querySelectorAll('.delete-document-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this document?')) return;
      try {
        await fetchJSON(`/api/documents/${btn.dataset.id}`, { method: 'DELETE' });
        renderView(id);
      } catch (e) {
        alert('Failed to delete document: ' + e.message);
      }
    };
  });
  
  // Event handlers for documents
  document.getElementById('upload-documents-btn').onclick = async () => {
    const fileInput = document.getElementById('document-upload');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }
    
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    progressDiv.style.display = 'block';
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progressBar.style.width = `${((i + 1) / files.length) * 100}%`;
        
        // Compress file if larger than 500KB
        let fileToUpload = file;
        if (file.size > 500 * 1024) {
          fileToUpload = await compressFile(file);
        }
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('initiativeId', id);
        
        await fetchJSON('/api/documents', {
          method: 'POST',
          body: formData,
          skipJson: true // Skip JSON parsing for file upload
        });
      }
      
      fileInput.value = '';
      progressDiv.style.display = 'none';
      progressBar.style.width = '0%';
      renderView(id);
    } catch (error) {
      alert('Failed to upload documents: ' + error.message);
      progressDiv.style.display = 'none';
      progressBar.style.width = '0%';
    }
  };
  
  document.querySelectorAll('.delete-document-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this document?')) return;
      try {
        await fetchJSON(`/api/documents/${btn.dataset.id}`, { method: 'DELETE' });
        renderView(id);
      } catch (e) {
        alert('Failed to delete document: ' + e.message);
      }
    };
  });
  
  // Setup @mention autocomplete for comment textarea
  setupMentionAutocomplete('new-comment');
  
  // Edit mode toggle button - replace view with edit form
  document.getElementById('toggle-edit-btn').onclick = () => {
    const itPicIds = i.itPicIds || (i.itPicId ? [i.itPicId] : []);
    const card = document.querySelector('.card');
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">Edit Initiative</h2>
        <div>
          <button id="save-btn" class="primary">💾 Save</button>
          <button id="cancel-edit-btn" style="margin-left: 8px;">Cancel</button>
        </div>
      </div>
      <form id="edit-form" class="form">
        ${formRow('Initiative Name', `<input name="name" value="${(i.name || '').replace(/"/g, '&quot;')}" required />`)}
        ${formRow('Ticket', `<input name="ticket" value="${(i.ticket || '').replace(/"/g, '&quot;')}" readonly style="background: #f0f0f0;" />`)}
        ${formRow('Type', `<input name="type" value="${i.type}" readonly style="background: #f0f0f0;" />`)}
        ${formRow('Create Date', `<input type="date" value="${i.createdAt?.slice(0,10) || ''}" readonly style="background: #f0f0f0;" />`)}
        ${formRow('Priority', `<select name="priority">${['P0','P1','P2'].map(p => `<option value="${p}" ${i.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select>`)}
          ${formRow('Status', `<select name="status">${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s => `<option value="${s}" ${i.status && i.status.toLowerCase() === s.toLowerCase() ? 'selected' : ''}>${s}</option>`).join('')}</select>`)}
        ${formRow('Milestone', `<select name="milestone">${['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'].map(m => `<option value="${m}" ${i.milestone === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}
        ${formRow('Department', `<select name="departmentId" required>${LOOKUPS.departments.map(d => `<option value="${d.id}" ${d.id === i.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}</select>`)}
        ${formRow('Start Date', `<input type="date" name="startDate" value="${i.startDate?.slice(0,10) || ''}" required />`)}
        ${formRow('End Date', `<input type="date" name="endDate" value="${i.endDate?.slice(0,10) || ''}" />`)}
        <div class="form-row"><label>Age Since Created</label><div><strong>${daysSinceCreated} days</strong></div></div>
        ${formRow('Description', `<textarea name="description" class="long-text" required style="min-height: 100px;">${(i.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`)}
        ${formRow('Business Impact', `<textarea name="businessImpact" class="long-text" required style="min-height: 100px;">${(i.businessImpact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`)}
        ${formRow('Remark', `<textarea name="remark" class="long-text" style="min-height: 80px;">${(i.remark || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`)}
        ${formRow('Project Doc Link', `<input name="documentationLink" type="url" value="${i.documentationLink || ''}" />`)}
        
        <!-- Project Team Section -->
        <div style="margin-top: 24px; padding: 20px; background: var(--gray-50); border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: var(--text);">👥 Project Team</h3>
          ${formRow('IT PM', `<select name="itPmId">${[''].concat(LOOKUPS.users.map(u => u.id)).map(uid => `<option value="${uid}" ${i.itPmId === uid ? 'selected' : ''}>${uid ? nameById(LOOKUPS.users, uid) : 'None'}</option>`).join('')}</select>`)}
          ${formRow('IT PIC', createMultiSelect('itPicIds', LOOKUPS.users, itPicIds))}
          ${formRow('IT Manager', createMultiSelect('itManagerIds', LOOKUPS.users, i.itManagerIds || []))}
          ${formRow('Business Owner / Requestor', `<select name="businessOwnerId" required>${LOOKUPS.users.map(u => `<option value="${u.id}" ${u.id === i.businessOwnerId ? 'selected' : ''}>${u.name}</option>`).join('')}</select>`)}
          ${formRow('Business Users', createMultiSelect('businessUserIds', LOOKUPS.users, i.businessUserIds || []))}
        </div>
        
        ${i.type === 'CR' ? `
          <div style="margin-top: 24px;">
            <h3>CR Dates</h3>
            ${formRow('CR Submission Start', `<input type="date" name="cr.crSubmissionStart" value="${i.cr?.crSubmissionStart?.slice(0,10) || ''}" />`)}
            ${formRow('CR Submission End', `<input type="date" name="cr.crSubmissionEnd" value="${i.cr?.crSubmissionEnd?.slice(0,10) || ''}" />`)}
            ${formRow('Development Start', `<input type="date" name="cr.developmentStart" value="${i.cr?.developmentStart?.slice(0,10) || ''}" />`)}
            ${formRow('Development End', `<input type="date" name="cr.developmentEnd" value="${i.cr?.developmentEnd?.slice(0,10) || ''}" />`)}
            ${formRow('SIT Start', `<input type="date" name="cr.sitStart" value="${i.cr?.sitStart?.slice(0,10) || ''}" />`)}
            ${formRow('SIT End', `<input type="date" name="cr.sitEnd" value="${i.cr?.sitEnd?.slice(0,10) || ''}" />`)}
            ${formRow('UAT Start', `<input type="date" name="cr.uatStart" value="${i.cr?.uatStart?.slice(0,10) || ''}" />`)}
            ${formRow('UAT End', `<input type="date" name="cr.uatEnd" value="${i.cr?.uatEnd?.slice(0,10) || ''}" />`)}
            ${formRow('Live Date', `<input type="date" name="cr.liveDate" value="${i.cr?.liveDate?.slice(0,10) || ''}" />`)}
          </div>
        ` : ''}
        <div style="margin-top: 20px; display: flex; gap: 12px;">
          <button type="button" id="cancel-edit-btn-2">Cancel</button>
          <button type="button" id="save-btn-2" class="primary">💾 Save</button>
        </div>
      </form>
      <div style="margin-top:12px"><a href="#list"><button>Back</button></a></div>
    `;
    
    initializeMultiSelects();
    
    // Save button handlers (both buttons)
    const saveHandler = async () => {
      const form = document.getElementById('edit-form');
      const fd = new FormData(form);
      const obj = Object.fromEntries(fd.entries());
      
      // Parse comma-separated arrays
      const businessUserIds = obj.businessUserIds ? obj.businessUserIds.split(',').filter(Boolean) : [];
      const itPicIds = obj.itPicIds ? obj.itPicIds.split(',').filter(Boolean) : [];
      const itManagerIds = obj.itManagerIds ? obj.itManagerIds.split(',').filter(Boolean) : [];
      
      // Debug logging
      console.log('[Frontend] Edit form data:', {
        'obj.itManagerIds': obj.itManagerIds,
        'parsed itManagerIds': itManagerIds,
        'current i.itManagerIds': i.itManagerIds
      });
      
      const payload = {
        name: obj.name || i.name,
        description: obj.description,
        businessImpact: obj.businessImpact,
        priority: obj.priority,
        businessOwnerId: obj.businessOwnerId,
        businessUserIds: businessUserIds.length > 0 ? businessUserIds : null,
        departmentId: obj.departmentId,
        itPicIds: itPicIds.length > 0 ? itPicIds : null,
        itPmId: obj.itPmId || null,
        itManagerIds: itManagerIds.length > 0 ? itManagerIds : null,
        status: obj.status,
        milestone: obj.milestone,
        startDate: obj.startDate,
        endDate: obj.endDate || null,
        remark: obj.remark || null,
        documentationLink: obj.documentationLink || null,
        changedBy: currentUser?.id || 'Unknown'
      };
      
      if (i.type === 'CR') {
        payload.cr = {
          crSubmissionStart: obj['cr.crSubmissionStart'] || null,
          crSubmissionEnd: obj['cr.crSubmissionEnd'] || null,
          developmentStart: obj['cr.developmentStart'] || null,
          developmentEnd: obj['cr.developmentEnd'] || null,
          sitStart: obj['cr.sitStart'] || null,
          sitEnd: obj['cr.sitEnd'] || null,
          uatStart: obj['cr.uatStart'] || null,
          uatEnd: obj['cr.uatEnd'] || null,
          liveDate: obj['cr.liveDate'] || null
        };
      }
      
      try {
        await fetchJSON(`/api/initiatives/${id}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        renderView(id);
      } catch (e) {
        alert('Failed to save changes: ' + e.message);
      }
    };
    
    document.getElementById('save-btn').onclick = saveHandler;
    document.getElementById('save-btn-2').onclick = saveHandler;
    
    // Cancel button handlers (both buttons)
    const cancelHandler = () => {
      renderView(id);
    };
    document.getElementById('cancel-edit-btn').onclick = cancelHandler;
    document.getElementById('cancel-edit-btn-2').onclick = cancelHandler;
  };
  
  // Event handlers for comments
  document.getElementById('add-comment-btn').onclick = async () => {
    const textarea = document.getElementById('new-comment');
    const body = textarea.value.trim();
    if (!body) return;
    
    try {
      await fetchJSON('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiativeId: id, body })
      });
      textarea.value = '';
      renderView(id);
      // Refresh notifications after adding comment
      if (typeof loadNotifications === 'function') loadNotifications();
    } catch (e) {
      alert('Failed to add comment: ' + e.message);
    }
  };
  
  document.querySelectorAll('.edit-comment-btn').forEach(btn => {
    btn.onclick = async () => {
      const commentId = btn.dataset.id;
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const newBody = prompt('Edit comment:', comment.body);
      if (newBody === null || newBody.trim() === comment.body) return;
      
      try {
        await fetchJSON(`/api/comments/${commentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: newBody })
        });
        renderView(id);
      } catch (e) {
        alert('Failed to update comment: ' + e.message);
      }
    };
  });
  
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this comment?')) return;
      try {
        await fetchJSON(`/api/comments/${btn.dataset.id}`, { method: 'DELETE' });
        renderView(id);
      } catch (e) {
        alert('Failed to delete comment: ' + e.message);
      }
    };
  });
  
  // Event handlers for tasks
  document.getElementById('new-task-btn').onclick = () => showTaskModal(id);
  document.getElementById('download-task-template-btn').onclick = () => downloadTaskTemplate();
  document.getElementById('upload-tasks-btn').onclick = () => showTaskUploadModal(id);
  
  document.querySelectorAll('.edit-task-btn').forEach(btn => {
    btn.onclick = () => showTaskModal(id, btn.dataset.id);
  });
  
  document.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this task?')) return;
      try {
        await fetchJSON(`/api/tasks/${btn.dataset.id}`, { method: 'DELETE' });
        renderView(id);
      } catch (e) {
        alert('Failed to delete task: ' + e.message);
      }
    };
  });
  
  // Task view switcher
  document.querySelectorAll('.task-view-btn').forEach(btn => {
    btn.onclick = () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.task-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tasks-list-view').classList.toggle('hidden', view !== 'list');
      document.getElementById('tasks-kanban-view').classList.toggle('hidden', view !== 'kanban');
      document.getElementById('tasks-gantt-view').classList.toggle('hidden', view !== 'gantt');
      
      // Render Gantt chart when switching to Gantt view
      if (view === 'gantt') {
        renderGanttChart(tasks, id);
      }
    };
  });
  
  // Kanban drag and drop functionality
  let draggedTask = null;
  let draggedTaskStatus = null;
  
  document.querySelectorAll('.kanban-task').forEach(taskEl => {
    // Make tasks draggable
    taskEl.addEventListener('dragstart', (e) => {
      draggedTask = taskEl;
      draggedTaskStatus = taskEl.dataset.status;
      taskEl.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', taskEl.outerHTML);
    });
    
    taskEl.addEventListener('dragend', (e) => {
      taskEl.style.opacity = '1';
      // Remove drag-over styling from all columns
      document.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('drag-over');
      });
    });
    
    // Click to edit (but not when dragging)
    let isDragging = false;
    taskEl.addEventListener('mousedown', () => {
      isDragging = false;
    });
    taskEl.addEventListener('mousemove', () => {
      isDragging = true;
    });
    taskEl.addEventListener('click', (e) => {
      if (!isDragging) {
        showTaskModal(id, taskEl.dataset.id);
      }
      isDragging = false;
    });
  });
  
  // Make columns drop targets
  document.querySelectorAll('.kanban-column').forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      column.classList.add('drag-over');
    });
    
    column.addEventListener('dragleave', (e) => {
      column.classList.remove('drag-over');
    });
    
    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      
      if (!draggedTask) return;
      
      const newStatus = column.dataset.status;
      const taskId = draggedTask.dataset.id;
      const oldStatus = draggedTaskStatus;
      
      // Don't do anything if dropped in the same column
      if (newStatus === oldStatus) {
        draggedTask = null;
        return;
      }
      
      // Store reference to the task element
      const taskElement = draggedTask;
      const taskContainer = taskElement.parentElement; // kanban-tasks div
      const oldColumn = taskContainer.closest('.kanban-column');
      
      // Update task status via API
      try {
        await fetchJSON(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        
        // Update the task element's data-status attribute
        taskElement.dataset.status = newStatus;
        
        // Move the task element to the new column
        const newColumnTasks = column.querySelector('.kanban-tasks');
        if (newColumnTasks && taskElement.parentElement !== newColumnTasks) {
          newColumnTasks.appendChild(taskElement);
        }
        
        // Update column counts
        const updateColumnCount = (col) => {
          const count = col.querySelectorAll('.kanban-task').length;
          const header = col.querySelector('h4');
          if (header) {
            const status = col.dataset.status;
            header.textContent = `${status} (${count})`;
          }
        };
        updateColumnCount(oldColumn);
        updateColumnCount(column);
        
        // Reset dragged task reference
        draggedTask = null;
      } catch (error) {
        alert('Failed to update task status: ' + error.message);
        draggedTask = null;
      }
    });
  });
}

// Download task template function
function downloadTaskTemplate() {
  const headers = ['name', 'description', 'startDate', 'endDate', 'assigneeId', 'status', 'milestone'];
  const exampleRow = ['Task Name', 'Task Description', '2025-01-01', '2025-01-15', '', 'Not Started', 'Preparation'];
  
  const csvContent = [
    headers.join(','),
    exampleRow.join(','),
    'Note: assigneeId should be a user ID from the system',
    'Status options: Not Started, On Hold, On Track, At Risk, Delayed, Live, Cancelled',
    'Milestone options: Preparation, Business Requirement, Tech Assessment, Planning, Development, Testing, Live'
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'task_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Gantt Chart rendering function
function renderGanttChart(tasks, initiativeId) {
  const ganttContainer = document.getElementById('gantt-chart');
  if (!ganttContainer) return;
  
  // Filter tasks that have dates
  const tasksWithDates = tasks.filter(t => t.startDate || t.endDate);
  const tasksWithoutDates = tasks.filter(t => !t.startDate && !t.endDate);
  
  if (tasks.length === 0) {
    ganttContainer.innerHTML = '<p class="muted" style="text-align: center; padding: 40px;">No tasks available</p>';
    return;
  }
  
  // Calculate date range
  let minDate = null;
  let maxDate = null;
  
  tasksWithDates.forEach(t => {
    if (t.startDate) {
      const date = new Date(t.startDate);
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
    if (t.endDate) {
      const date = new Date(t.endDate);
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
  });
  
  // If no dates, use current date ± 30 days
  if (!minDate || !maxDate) {
    const today = new Date();
    minDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Add some padding
  const padding = (maxDate - minDate) * 0.1;
  minDate = new Date(minDate.getTime() - padding);
  maxDate = new Date(maxDate.getTime() + padding);
  
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  const dayWidth = Math.max(20, Math.min(50, (800 / totalDays))); // Dynamic column width
  
  // Generate week headers
  const weekHeaders = [];
  let currentWeek = new Date(minDate);
  while (currentWeek <= maxDate) {
    weekHeaders.push(new Date(currentWeek));
    currentWeek.setDate(currentWeek.getDate() + 7);
  }
  
  // Calculate task positions
  const calculateTaskPosition = (task) => {
    const start = task.startDate ? new Date(task.startDate) : minDate;
    const end = task.endDate ? new Date(task.endDate) : (task.startDate ? new Date(new Date(task.startDate).getTime() + 7 * 24 * 60 * 60 * 1000) : maxDate);
    
    const daysFromStart = Math.floor((start - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    
    return {
      left: daysFromStart * dayWidth,
      width: duration * dayWidth,
      start,
      end
    };
  };
  
  // Status colors
  const statusColors = {
    'Not Started': '#94a3b8',
    'On Hold': '#f59e0b',
    'On Track': '#10b981',
    'At Risk': '#ef4444',
    'Delayed': '#dc2626',
    'Live': '#3b82f6',
    'Cancelled': '#6b7280'
  };
  
  const getStatusColor = (status) => statusColors[status] || '#94a3b8';
  
  // Render Gantt chart
  const rowHeight = 50;
  const headerHeight = 60;
  const sidebarWidth = 250;
  
  let html = `
    <div style="position: relative;">
      <!-- Header with dates -->
      <div style="position: sticky; top: 0; z-index: 10; background: white; border-bottom: 2px solid var(--border);">
        <div style="display: flex; height: ${headerHeight}px;">
          <div style="width: ${sidebarWidth}px; padding: 8px; font-weight: 600; border-right: 1px solid var(--border); display: flex; align-items: center;">
            Task Name
          </div>
          <div style="flex: 1; position: relative; overflow-x: auto;">
            <div style="display: flex; min-width: ${totalDays * dayWidth}px;">
              ${weekHeaders.map((week, idx) => {
                const weekStart = new Date(week);
                const weekEnd = new Date(week);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const weekDays = Math.ceil((weekEnd - weekStart) / (1000 * 60 * 60 * 24)) + 1;
                return `
                  <div style="width: ${weekDays * dayWidth}px; border-right: 1px solid var(--border); padding: 4px; text-align: center; font-size: 11px;">
                    <div style="font-weight: 600;">Week ${idx + 1}</div>
                    <div style="color: var(--muted); font-size: 10px;">
                      ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                      ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Task rows -->
      <div style="position: relative;">
        ${tasks.map((task, idx) => {
          const assignee = nameById(LOOKUPS.users, task.assigneeId) || 'Unassigned';
          const status = task.status || 'Not Started';
          const color = getStatusColor(status);
          const pos = calculateTaskPosition(task);
          
          return `
            <div style="position: relative; height: ${rowHeight}px; border-bottom: 1px solid var(--gray-200); display: flex;">
              <!-- Sidebar -->
              <div style="width: ${sidebarWidth}px; padding: 8px; border-right: 1px solid var(--border); background: var(--gray-50); display: flex; flex-direction: column; justify-content: center; position: sticky; left: 0; z-index: 5;">
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${task.name}</div>
                <div style="font-size: 11px; color: var(--muted);">
                  <span style="display: inline-block; width: 8px; height: 8px; background: ${color}; border-radius: 50%; margin-right: 4px;"></span>
                  ${status} • ${assignee}
                </div>
              </div>
              
              <!-- Timeline area -->
              <div style="flex: 1; position: relative; min-width: ${totalDays * dayWidth}px;">
                ${task.startDate || task.endDate ? `
                  <div class="gantt-task-bar" 
                       data-task-id="${task.id}"
                       style="position: absolute; 
                              left: ${pos.left}px; 
                              width: ${pos.width}px; 
                              top: 8px; 
                              height: ${rowHeight - 16}px; 
                              background: ${color}; 
                              border-radius: 4px; 
                              cursor: pointer;
                              display: flex;
                              align-items: center;
                              padding: 0 8px;
                              color: white;
                              font-size: 11px;
                              font-weight: 500;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                              transition: transform 0.2s, box-shadow 0.2s;"
                       title="${task.name} (${task.startDate ? task.startDate.slice(0,10) : 'No start'} → ${task.endDate ? task.endDate.slice(0,10) : 'No end'})">
                    ${task.milestone ? `📍 ${task.milestone}` : task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name}
                  </div>
                ` : `
                  <div style="position: absolute; left: 0; top: 8px; padding: 8px; color: var(--muted); font-size: 11px; font-style: italic;">
                    No dates set
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      ${tasksWithoutDates.length > 0 ? `
        <div style="padding: 16px; background: var(--gray-50); border-top: 1px solid var(--border); margin-top: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Tasks without dates (${tasksWithoutDates.length}):</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${tasksWithoutDates.map(t => `
              <div style="padding: 6px 12px; background: white; border-radius: 4px; font-size: 12px; border: 1px solid var(--border);">
                ${t.name}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  ganttContainer.innerHTML = html;
  
  // Add click handlers for task bars
  document.querySelectorAll('.gantt-task-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      showTaskModal(initiativeId, bar.dataset.taskId);
    });
    bar.addEventListener('mouseenter', () => {
      bar.style.transform = 'scale(1.02)';
      bar.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    bar.addEventListener('mouseleave', () => {
      bar.style.transform = 'scale(1)';
      bar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
  });
}

// Task modal functions
async function showTaskModal(initiativeId, taskId = null) {
  let task = null;
  if (taskId) {
    try {
      task = await fetchJSON(`/api/tasks/${taskId}`);
    } catch (e) {
      alert('Failed to load task: ' + e.message);
      return;
    }
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <h3>${taskId ? 'Edit Task' : 'New Task'}</h3>
      <form id="task-form">
        <div style="margin-bottom: 12px;">
          <label>Task Name *</label>
          <input type="text" name="name" value="${task?.name || ''}" required style="width: 100%;">
        </div>
        <div style="margin-bottom: 12px;">
          <label>Description</label>
          <textarea name="description" rows="3" style="width: 100%;">${task?.description || ''}</textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <label>Start Date</label>
            <input type="date" name="startDate" value="${task?.startDate ? task.startDate.slice(0,10) : ''}">
          </div>
          <div>
            <label>End Date</label>
            <input type="date" name="endDate" value="${task?.endDate ? task.endDate.slice(0,10) : ''}">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <label>Assignee</label>
            <select name="assigneeId" style="width: 100%;">
              <option value="">Unassigned</option>
              ${LOOKUPS.users.map(u => `<option value="${u.id}" ${task?.assigneeId === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select name="status" style="width: 100%;">
              ${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s => 
                `<option value="${s}" ${(task?.status || 'Not Started') === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <label>Milestone</label>
          <select name="milestone" style="width: 100%;">
            <option value="">None</option>
            ${['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'].map(m => 
              `<option value="${m}" ${task?.milestone === m ? 'selected' : ''}>${m}</option>`
            ).join('')}
          </select>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="primary">${taskId ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      initiativeId,
      name: formData.get('name'),
      description: formData.get('description') || null,
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null,
      assigneeId: formData.get('assigneeId') || null,
      status: formData.get('status') || 'Not Started',
      milestone: formData.get('milestone') || null
    };
    
    try {
      if (taskId) {
        await fetchJSON(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetchJSON('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      modal.remove();
      const hash = location.hash;
      if (hash.startsWith('#view/')) {
        const viewId = hash.split('/')[1];
        if (viewId) renderView(viewId);
      }
    } catch (e) {
      alert('Failed to save task: ' + e.message);
    }
  };
}

function showTaskUploadModal(initiativeId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <h3>Upload Tasks (CSV)</h3>
      <p class="muted" style="margin-bottom: 16px;">
        Upload a CSV file with columns: name, description, startDate, endDate, assigneeId, status, milestone
      </p>
      <input type="file" id="task-file-input" accept=".csv" style="margin-bottom: 16px;">
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button type="button" onclick="this.closest('.modal').remove()">Cancel</button>
        <button id="upload-tasks-submit" class="primary">Upload</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('upload-tasks-submit').onclick = async () => {
    const fileInput = document.getElementById('task-file-input');
    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a file');
      return;
    }
    
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      alert('CSV file must have at least a header and one data row');
      return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const tasks = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const task = { initiativeId };
      headers.forEach((h, idx) => {
        if (values[idx]) task[h] = values[idx];
      });
      if (task.name) tasks.push(task);
    }
    
    if (tasks.length === 0) {
      alert('No valid tasks found in CSV');
      return;
    }
    
    try {
      await fetchJSON('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiativeId, tasks })
      });
      modal.remove();
      const hash = location.hash;
      if (hash.startsWith('#view/')) {
        const viewId = hash.split('/')[1];
        if (viewId) renderView(viewId);
      }
    } catch (e) {
      alert('Failed to upload tasks: ' + e.message);
    }
  };
}

async function renderEdit(id) {
  setActive('#list');
  await ensureLookups();
  const i = await fetchJSON('/api/initiatives/' + id);
  
  app.innerHTML = `
    <div class="card">
      <h2>Edit Initiative</h2>
      <form id="f" class="form">
        ${formRow('Type', `<select name="type" required disabled><option ${i.type === 'Project' ? 'selected' : ''}>Project</option><option ${i.type === 'CR' ? 'selected' : ''}>CR</option></select><input type="hidden" name="type" value="${i.type}" />`)}
        ${commonFields(i)}
        <div id="crContainer" class="card" style="display:${i.type === 'CR' ? 'block' : 'none'}">
          <h3>CR Details</h3>
          ${crFields()}
        </div>
        <div>
          <button class="primary" type="submit">Save Changes</button>
          <a href="#view/${id}"><button type="button">Cancel</button></a>
        </div>
      </form>
    </div>
  `;
  
  // Initialize multi-select dropdowns
  initializeMultiSelects();
  
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const obj = Object.fromEntries(fd.entries());
    
    // Parse comma-separated arrays
    const businessUserIds = obj.businessUserIds ? obj.businessUserIds.split(',').filter(Boolean) : [];
    const itPicIds = obj.itPicIds ? obj.itPicIds.split(',').filter(Boolean) : [];
    const itManagerIds = obj.itManagerIds ? obj.itManagerIds.split(',').filter(Boolean) : [];
    
    const payload = {
      name: obj.name,
      description: obj.description,
      businessImpact: obj.businessImpact,
      priority: obj.priority,
      businessOwnerId: obj.businessOwnerId,
      businessUserIds: businessUserIds.length > 0 ? businessUserIds : null,
      departmentId: obj.departmentId,
      itPicIds: itPicIds.length > 0 ? itPicIds : null,
      itPmId: obj.itPmId || null,
      itManagerIds: itManagerIds.length > 0 ? itManagerIds : null,
      status: obj.status,
      milestone: obj.milestone,
      startDate: obj.startDate,
      endDate: obj.endDate || null,
      remark: obj.remark || null,
      documentationLink: obj.documentationLink || null,
      changedBy: currentUser?.id || 'Unknown'
    };
    if (i.type === 'CR') {
      payload.cr = {
        crSubmissionStart: obj['cr.crSubmissionStart'] || null,
        crSubmissionEnd: obj['cr.crSubmissionEnd'] || null,
        developmentStart: obj['cr.developmentStart'] || null,
        developmentEnd: obj['cr.developmentEnd'] || null,
        sitStart: obj['cr.sitStart'] || null,
        sitEnd: obj['cr.sitEnd'] || null,
        uatStart: obj['cr.uatStart'] || null,
        uatEnd: obj['cr.uatEnd'] || null,
        liveDate: obj['cr.liveDate'] || null
      };
    }
    try {
      await fetchJSON(`/api/initiatives/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      location.hash = `#view/${id}`;
      renderView(id);
    } catch (e) {
      alert(e.message);
    }
  };
}

async function renderCRList() {
  console.log('renderCRList called');
  setActive('#crlist');
  try {
    await ensureLookups();
    await getCurrentUser(); // Ensure current user is loaded for admin check
    console.log('Lookups loaded successfully for CR List');
  } catch (error) {
    console.error('Error loading lookups for CR List:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  const urlParams = new URLSearchParams(location.search);
  const q = urlParams.get('q') || '';
  // Parse multi-value filters (comma-separated)
  const parseFilter = (key) => {
    const val = urlParams.get(key);
    return val ? val.split(',').filter(v => v) : [];
  };
  const filter = {
    departmentId: parseFilter('departmentId'),
    priority: parseFilter('priority'),
    status: parseFilter('status'),
    milestone: parseFilter('milestone')
  };
  const sortParam = urlParams.get('sort') || '';
  
  // Build API query string with multi-value filters
  const apiQs = new URLSearchParams();
  apiQs.set('type', 'CR');
  if (q) apiQs.set('q', q);
  if (filter.departmentId.length) apiQs.set('departmentId', filter.departmentId.join(','));
  if (filter.priority.length) apiQs.set('priority', filter.priority.join(','));
  if (filter.status.length) apiQs.set('status', filter.status.join(','));
  if (filter.milestone.length) apiQs.set('milestone', filter.milestone.join(','));
  
  let data;
  try {
    data = await fetchJSON('/api/initiatives?' + apiQs.toString());
  } catch (e) {
    console.error('Failed to fetch CR initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load CR initiatives: ${e.message}</div>`;
    return;
  }
  
  // Calculate milestone counts from filtered data
  // Database stores: "Preparation", "Business Requirement", "Tech Assessment", "Planning", "Development", "Testing", "Live"
  const milestones = ['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'];
  const milestoneCounts = {};
  // Display names for the graph (same as database values)
  const milestoneDisplayNames = {
    'Preparation': 'Preparation',
    'Business Requirement': 'Business Requirement',
    'Tech Assessment': 'Tech Assessment',
    'Planning': 'Planning',
    'Development': 'Development',
    'Testing': 'Testing',
    'Live': 'Live'
  };
  // Milestone colors mapping
  const milestoneColors = {
    'Preparation': '#8b5cf6', // Purple
    'Business Requirement': '#3b82f6', // Blue
    'Tech Assessment': '#06b6d4', // Cyan
    'Planning': '#10b981', // Green
    'Development': '#f59e0b', // Amber
    'Testing': '#ef4444', // Red
    'Live': '#22c55e' // Green
  };
  milestones.forEach(m => milestoneCounts[m] = 0);
  data.forEach(i => {
    if (i.milestone && milestoneCounts.hasOwnProperty(i.milestone)) {
      milestoneCounts[i.milestone]++;
    }
  });
  
  // CR data is now included in the API response
  const dataWithCR = data.map(initiative => ({
    initiative,
    crData: initiative.cr
  }));
  if (sortParam) {
    const [key, dir] = sortParam.split(':');
    const dirMul = dir === 'desc' ? -1 : 1;
    const nameFor = (keyName, id) => {
      if (keyName === 'departmentId') return nameById(LOOKUPS.departments, id);
      if (keyName === 'businessOwnerId' || keyName === 'itPicId') return nameById(LOOKUPS.users, id);
      return id || '';
    };
    dataWithCR.sort((a,b) => {
      let va, vb;
      if (key.endsWith('Id')) {
        va = nameFor(key, a.initiative[key]);
        vb = nameFor(key, b.initiative[key]);
      } else if (key === 'businessImpact' || key === 'remark' || key === 'documentationLink') {
        va = String(a.initiative[key] || '').toLowerCase();
        vb = String(b.initiative[key] || '').toLowerCase();
      } else {
        va = a.initiative[key] || '';
        vb = b.initiative[key] || '';
      }
      return String(va).localeCompare(String(vb)) * dirMul;
    });
  }
  
  // Get column visibility preferences
  const colVisibility = getColumnVisibility('crlist') || getDefaultColumns('crlist');
  
  // Column definitions for CR List
  const columns = [
    { key: 'ticket', class: 'col-ticket', label: 'Ticket', sortable: true },
    { key: 'name', class: 'col-name', label: 'CR Name', sortable: true },
    { key: 'priority', class: 'col-priority', label: 'Priority', sortable: true },
    { key: 'status', class: 'col-status', label: 'Status', sortable: true },
    { key: 'milestone', class: 'col-milestone', label: 'Milestone', sortable: true },
    { key: 'departmentId', class: 'col-department', label: 'Department', sortable: true },
    { key: 'businessOwnerId', class: 'col-owner', label: 'Business Owner', sortable: true },
    { key: 'itPicId', class: 'col-pic', label: 'IT PIC', sortable: true },
    { key: 'startDate', class: 'col-date', label: 'Start Date', sortable: true },
    { key: 'createdAt', class: 'col-date', label: 'Create Date', sortable: true },
    { key: 'endDate', class: 'col-date', label: 'End Date', sortable: true },
    { key: 'businessImpact', class: 'col-impact', label: 'Business Impact', sortable: true },
    { key: 'remark', class: 'col-remark', label: 'Remark', sortable: true },
    { key: 'documentationLink', class: 'col-doc', label: 'CR Doc Link', sortable: true },
    { key: 'timeline', class: 'col-timeline', label: 'CR Timeline', sortable: false },
    { key: 'actions', class: 'col-actions', label: 'Actions', sortable: false }
  ];
  
  app.innerHTML = `
    <div class="milestone-graph">
      <h3>Milestone Distribution</h3>
      <div class="milestone-flow">
        ${milestones.map((m, index) => {
          const count = milestoneCounts[m] || 0;
          const isLast = index === milestones.length - 1;
          const displayName = milestoneDisplayNames[m] || m;
          const color = milestoneColors[m] || 'var(--brand)';
          return `
            <div class="milestone-step">
              <div class="milestone-circle ${count > 0 ? 'active' : ''}" style="${count > 0 ? `border-color: ${color}; background: linear-gradient(135deg, ${color}15 0%, ${color}25 100%);` : ''}">
                <div class="milestone-name">${displayName}</div>
                <div class="milestone-count-badge" style="background: ${count > 0 ? color : 'var(--muted)'}">${count}</div>
              </div>
              ${!isLast ? '<div class="milestone-arrow">→</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-row">
        <div class="search-group">
          <input id="search" placeholder="Search by name, ticket..." value="${q}">
          <button id="doSearch">Search</button>
        </div>
        <div class="filter-group">
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fDepartment">
              Department ${filter.departmentId.length > 0 ? `(${filter.departmentId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fDepartment">
              ${LOOKUPS.departments.map(d => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${d.id}" ${filter.departmentId.includes(d.id) ? 'checked' : ''}>
                  ${d.name}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fPriority">
              Priority ${filter.priority.length > 0 ? `(${filter.priority.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fPriority">
              ${['P0','P1','P2'].map(p => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${p}" ${filter.priority.includes(p) ? 'checked' : ''}>
                  ${p}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fStatus">
              Status ${filter.status.length > 0 ? `(${filter.status.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fStatus">
              ${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${s}" ${filter.status.includes(s) ? 'checked' : ''}>
                  ${s}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fMilestone">
              Milestone ${filter.milestone.length > 0 ? `(${filter.milestone.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fMilestone">
              ${milestones.map(m => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${m}" ${filter.milestone.includes(m) ? 'checked' : ''}>
                  ${milestoneDisplayNames[m] || m}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="action-group">
          <button id="btn-columns" onclick="showColumnSettings('crlist')" title="Column Settings" class="icon-btn">⚙️</button>
          <a href="#new"><button class="primary">+ New CR</button></a>
        </div>
      </div>
    </div>
    <table id="cr-table">
      <thead>
        <tr>
          ${columns.map(col => {
            const visible = colVisibility[col.class] !== false;
            const sortClass = col.sortable ? 'sortable' : '';
            const sortIndicator = sortParam && sortParam.startsWith(`${col.key}:`) ? (sortParam.includes(':desc') ? ' ↓' : ' ↑') : '';
            return `<th class="${sortClass} ${col.class}" data-key="${col.key}" data-col="${col.class}" style="display: ${visible ? 'table-cell' : 'none'}">${col.label}${sortIndicator}</th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>${dataWithCR.map(item => initiativeRow(item.initiative, item.crData, colVisibility)).join('')}</tbody>
    </table>
    <div id="column-settings-modal-cr" class="modal hidden">
      <div class="modal-content column-settings-modal">
        <h3 class="modal-title">Column Visibility</h3>
        <div class="modal-checkbox-controls">
          <button class="btn-link" onclick="checkAllColumns('crlist')">Check All</button>
          <span class="control-separator">|</span>
          <button class="btn-link" onclick="uncheckAllColumns('crlist')">Uncheck All</button>
        </div>
        <div id="column-checkboxes-cr" class="column-checkboxes-grid">
          ${columns.filter(c => c.key !== 'actions').map(col => `
            <label class="column-checkbox-label">
              <input type="checkbox" data-col="${col.class}" ${colVisibility[col.class] !== false ? 'checked' : ''} class="column-checkbox">
              <span class="column-checkbox-text">${col.label}</span>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeColumnSettings()">Cancel</button>
          <button class="btn-primary" onclick="saveColumnSettings('crlist')">Save View</button>
        </div>
      </div>
    </div>
  `;
  // Multi-select dropdown handlers (same as renderList)
  document.querySelectorAll('.multi-select-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const filterId = btn.dataset.filter;
      const dropdown = document.getElementById(`dropdown-${filterId}`);
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
      }
    };
  });
  
  // Checkbox change handlers
  document.querySelectorAll('.multi-select-option input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => {
      applyFiltersCR();
    };
  });
  
  function applyFiltersCR() {
    const searchVal = document.getElementById('search').value;
    const url = new URL(location.href);
    
    // Update search
    if (searchVal) url.searchParams.set('q', searchVal);
    else url.searchParams.delete('q');
    
    // Get selected values from each multi-select
    const getSelectedValues = (filterId) => {
      const checkboxes = document.querySelectorAll(`#dropdown-${filterId} input[type="checkbox"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    };
    
    const filterMap = {
      'fDepartment': 'departmentId',
      'fPriority': 'priority',
      'fStatus': 'status',
      'fMilestone': 'milestone'
    };
    
    Object.entries(filterMap).forEach(([filterId, paramKey]) => {
      const values = getSelectedValues(filterId);
      if (values.length > 0) {
        url.searchParams.set(paramKey, values.join(','));
      } else {
        url.searchParams.delete(paramKey);
      }
    });
    
    history.pushState({}, '', url);
    renderCRList();
  }
  
  document.getElementById('doSearch').onclick = () => {
    applyFiltersCR();
  };
  
  // Enter key on search input
  document.getElementById('search').onkeypress = (e) => {
    if (e.key === 'Enter') {
      applyFiltersCR();
    }
  };
  // Sorting
  document.querySelectorAll('thead th.sortable').forEach(th => {
    const resizer = document.createElement('span');
    resizer.className = 'col-resize';
    th.appendChild(resizer);
    th.onclick = (e) => {
      if (e.target === resizer) return; // ignore when resizing
      const key = th.dataset.key;
      const url = new URL(location.href);
      const current = url.searchParams.get('sort') || '';
      const [curKey, curDir] = current.split(':');
      const nextDir = curKey === key && curDir === 'asc' ? 'desc' : 'asc';
      url.searchParams.set('sort', `${key}:${nextDir}`);
      history.pushState({}, '', url);
      renderCRList();
    };
    // Resize behavior
    let startX = 0; let startWidth = 0;
    resizer.onmousedown = (ev) => {
      startX = ev.clientX;
      startWidth = th.offsetWidth;
      document.onmousemove = (mv) => {
        const dx = mv.clientX - startX;
        th.style.width = Math.max(80, startWidth + dx) + 'px';
      };
      document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
    };
  });
  document.querySelectorAll('button.delete').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this CR?')) return;
      await fetch(`/api/initiatives/${btn.dataset.id}`, { method: 'DELETE' });
      renderCRList();
    };
  });
  document.querySelectorAll('button.view').forEach(btn => {
    btn.onclick = () => location.hash = `#view/${btn.dataset.id}`;
  });
  document.querySelectorAll('button.edit').forEach(btn => {
    btn.onclick = () => location.hash = `#edit/${btn.dataset.id}`;
  });
}

// Show modal with filtered initiatives - must be global for onclick handlers
window.showInitiativesModal = async function(filterType, filterValue, title, initiativeType = 'Project') {
  console.log('showInitiativesModal called:', filterType, filterValue, title, initiativeType);
  const apiQs = new URLSearchParams();
  apiQs.set('type', initiativeType);
  
  if (filterType === 'status') {
    apiQs.set('status', filterValue);
  } else if (filterType === 'priority') {
    apiQs.set('priority', filterValue);
  } else if (filterType === 'departmentId') {
    apiQs.set('departmentId', filterValue);
  } else if (filterType === 'all') {
    // Show all projects
  }
  
  try {
    const initiatives = await fetchJSON('/api/initiatives?' + apiQs.toString());
    
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal initiatives-modal">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            <div class="modal-subtitle">${initiatives.length} ${initiatives.length === 1 ? 'initiative' : 'initiatives'} found</div>
          </div>
          <button class="modal-close-btn" onclick="this.closest('.modal-backdrop').remove()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-content">
          ${initiatives.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-text">No initiatives found</div>
              <div class="empty-state-subtext">Try adjusting your filters</div>
            </div>
          ` : ''}
          ${initiatives.map(i => {
            const statusClass = (i.status || '').replace(/\s+/g, '-');
            return `
              <div class="initiative-card-modal" onclick="location.hash='#view/${i.id}'; this.closest('.modal-backdrop').remove();">
                <div class="initiative-card-header">
                  <h3 class="initiative-card-title">${escapeHtml(i.name || 'Untitled')}</h3>
                  <span class="status-badge status-${statusClass}">${escapeHtml(i.status || 'N/A')}</span>
                </div>
                <div class="initiative-card-body">
                  <div class="initiative-card-section">
                    <div class="initiative-card-label">Description</div>
                    <div class="initiative-card-text">${escapeHtml(i.description || 'No description')}</div>
                  </div>
                  <div class="initiative-card-section">
                    <div class="initiative-card-label">Business Impact</div>
                    <div class="initiative-card-text">${escapeHtml(i.businessImpact || 'No business impact specified')}</div>
                  </div>
                </div>
                <div class="initiative-card-footer">
                  <span class="initiative-card-link">View Details →</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
  } catch (error) {
    alert('Failed to load initiatives: ' + error.message);
  }
}

async function renderDashboard() {
  setActive('#dashboard');
  await ensureLookups();
  
  // Get current user profile to check if they're a Manager
  let currentUserProfile = null;
  let isManager = false;
  let teamMembers = [];
  try {
    currentUserProfile = await fetchJSON('/api/profile');
    isManager = currentUserProfile.type === 'Manager';
    if (isManager && currentUserProfile.teamMemberIds && currentUserProfile.teamMemberIds.length > 0) {
      teamMembers = currentUserProfile.teamMemberIds.map(id => 
        LOOKUPS.users.find(u => u.id === id)
      ).filter(Boolean);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  }
  
  // Get filter values from URL or use defaults
  const urlParams = new URLSearchParams(location.search);
  const selectedDepartmentId = urlParams.get('departmentId') || '';
  const selectedItPmId = urlParams.get('itPmId') || '';
  const selectedTeamMemberId = urlParams.get('teamMemberId') || '';
  
  // Build API query string with filters
  const apiQs = new URLSearchParams();
  if (selectedDepartmentId) apiQs.set('departmentId', selectedDepartmentId);
  if (selectedItPmId) apiQs.set('itPmId', selectedItPmId);
  if (selectedTeamMemberId) apiQs.set('teamMemberId', selectedTeamMemberId);
  
  const d = await fetchJSON('/api/dashboard?' + apiQs.toString());
  
  // Create simple bar charts
  const createBarChart = (data, labelKey, valueKey, title, clickable = false) => {
    const max = Math.max(...data.map(item => item[valueKey]), 1);
    return `
      <div class="card">
        <h3>${title}</h3>
        <div style="margin-top: 16px;">
          ${data.map(item => {
            const percentage = (item[valueKey] / max) * 100;
            const statusClass = item[labelKey]?.replace(/\s+/g, '-') || '';
            const filterValue = item[labelKey] || '';
            const clickableStyle = clickable ? 'cursor: pointer;' : '';
            const clickableClass = clickable ? 'clickable-chart-item' : '';
            const dataAttrs = clickable ? `data-filter-type="${labelKey}" data-filter-value="${filterValue.replace(/"/g, '&quot;')}" data-title="${title}: ${filterValue.replace(/"/g, '&quot;')}"` : '';
            return `
              <div class="${clickableClass}" ${dataAttrs} style="display: flex; align-items: center; margin-bottom: 12px; ${clickableStyle}">
                <div style="width: 120px; font-size: 12px; color: var(--muted);">${item[labelKey]}</div>
                <div style="flex: 1; margin: 0 12px;">
                  <div style="background: #f1f5f9; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: ${statusClass.includes('Live') ? '#3b82f6' : statusClass.includes('At-Risk') ? '#f59e0b' : statusClass.includes('Delayed') ? '#ef4444' : '#6366f1'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                  </div>
                </div>
                <div style="width: 40px; text-align: right; font-weight: 600; font-size: 14px;">${item[valueKey]}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };
  
  // Helper function to create filter dropdown
  const createFilterDropdown = (id, label, options, value, onChange) => {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;">${label}</label>
        <select id="${id}" style="padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--surface); color: var(--text); cursor: pointer; min-width: 200px;" onchange="${onChange}">
          <option value="">All ${label}</option>
          ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select>
      </div>
    `;
  };
  
  // Get filter options
  const departmentOptions = LOOKUPS.departments.map(d => ({ value: d.id, label: d.name }));
  const itPmOptions = LOOKUPS.users
    .filter(u => {
      // Only include active users with roles: IT Manager, IT PM, or Admin
      if (u.active === false) return false;
      const role = (u.role || '').toLowerCase().trim();
      const isAdmin = u.isAdmin === true || u.isAdmin === 1 || role === 'admin' || role === 'administrator';
      // Check for IT Manager, IT PM, or Admin roles (case-insensitive)
      return role === 'it manager' || role === 'it pm' || role === 'itpm' || isAdmin;
    })
    .map(u => ({ value: u.id, label: u.name || u.email }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  // Team member options (only for Managers)
  const teamMemberOptions = isManager && teamMembers.length > 0
    ? teamMembers.map(m => ({ value: m.id, label: m.name || m.email }))
    : [];
  
  app.innerHTML = `
    <div class="card" style="margin-bottom: 24px; padding: 20px;">
      <div style="display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap;">
        ${createFilterDropdown('filter-department', 'Department', departmentOptions, selectedDepartmentId, 'updateDashboardFilters()')}
        ${createFilterDropdown('filter-itpm', 'IT PM', itPmOptions, selectedItPmId, 'updateDashboardFilters()')}
        ${isManager && teamMemberOptions.length > 0 ? createFilterDropdown('filter-team-member', 'Team Member', teamMemberOptions, selectedTeamMemberId, 'updateDashboardFilters()') : ''}
        ${(selectedDepartmentId || selectedItPmId || selectedTeamMemberId) ? `
          <button onclick="clearDashboardFilters()" style="padding: 10px 16px; background: var(--gray-100); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--text);">
            Clear Filters
          </button>
        ` : ''}
      </div>
    </div>
    <div class="kpis">
      <div class="card clickable-card" data-filter-type="all" data-filter-value="" data-title="All Projects" data-initiative-type="Project" style="cursor: pointer;">
        <div class="muted">Total Projects</div>
        <div style="font-size:32px;font-weight:700;color: var(--brand)">${d.projects}</div>
      </div>
      <div class="card clickable-card" data-filter-type="status" data-filter-value="LIVE" data-title="Live Projects" style="cursor: pointer;">
        <div class="muted">Live Projects</div>
        <div style="font-size:32px;font-weight:700;color: var(--success)">${d.liveCount || 0}</div>
      </div>
      <div class="card">
        <div class="muted">Avg Age (Days)</div>
        <div style="font-size:32px;font-weight:700;color: var(--warning)">${d.avgAgeSinceCreated}</div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      ${createBarChart(d.byStatus, 'status', 'c', 'Status Distribution', true)}
      ${createBarChart(d.byPriority, 'priority', 'c', 'Priority Distribution', true)}
      <div class="card">
        <h3>Project Aging (Days Since Created)</h3>
        <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
          ${d.projectAging.map(project => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 4px;">${project.name}</div>
                <div style="font-size: 12px; color: var(--muted);">
                  <span class="status-badge status-${project.status?.replace(/\s+/g, '-')}">${project.status}</span>
                  <span style="margin-left: 8px;">${project.milestone}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 600; color: var(--warning);">${project.daysSinceCreated} days</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      <div class="card">
        <h3>Project Milestone Timeline (Based on Daily Logs)</h3>
        <div style="margin-top: 16px; max-height: 500px; overflow-y: auto;">
          ${d.milestoneDurations.map(project => `
            <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid var(--brand);">
              <div style="font-weight: 700; margin-bottom: 8px; color: var(--brand); font-size: 16px;">${project.name}</div>
              <div style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">
                Current: <span class="status-badge status-${project.currentMilestone?.replace(/\s+/g, '-')}">${project.currentMilestone}</span>
              </div>
              <div style="display: grid; gap: 8px;">
                ${project.milestoneDetails.map(milestone => `
                  <div style="padding: 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-weight: 600; color: var(--text);">${milestone.milestone}</span>
                      <span style="padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; 
                        background: ${milestone.status === 'Current' ? '#dbeafe' : '#d1fae5'}; 
                        color: ${milestone.status === 'Current' ? '#1e40af' : '#065f46'};">
                        ${milestone.status}
                      </span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px; color: var(--muted);">
                      <div>
                        <strong>Start:</strong> ${milestone.startDate}
                      </div>
                      <div>
                        <strong>End:</strong> ${milestone.endDate || 'Ongoing'}
                      </div>
                      <div>
                        <strong>Duration:</strong> <span style="color: var(--warning); font-weight: 600;">${milestone.duration} days</span>
                      </div>
                    </div>
                    ${milestone.changedBy ? `
                      <div style="margin-top: 6px; font-size: 10px; color: var(--muted); border-top: 1px solid #f1f5f9; padding-top: 6px;">
                        Changed by: ${milestone.changedBy} on ${milestone.changedAt ? milestone.changedAt.slice(0, 10) : 'Unknown'}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Department Distribution</h3>
        <div style="margin-top: 16px;">
          ${d.byDepartment.map(item => {
            const deptName = nameById(LOOKUPS.departments, item.departmentId);
            const deptId = item.departmentId || '';
            return `
              <div class="clickable-chart-item" data-filter-type="departmentId" data-filter-value="${deptId}" data-title="Department: ${deptName}" data-initiative-type="Project" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px; cursor: pointer;">
                <span style="font-weight: 500;">${deptName}</span>
                <span style="font-weight: 600;">${item.c}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners for clickable cards
  document.querySelectorAll('.clickable-card[data-filter-type]').forEach(card => {
    card.addEventListener('click', () => {
      const filterType = card.dataset.filterType;
      const filterValue = card.dataset.filterValue || '';
      const title = card.dataset.title || '';
      const initiativeType = card.dataset.initiativeType || 'Project';
      console.log('Card clicked:', filterType, filterValue, title, initiativeType);
      showInitiativesModal(filterType, filterValue, title, initiativeType);
    });
  });
  
  // Add event listeners for chart items
  document.querySelectorAll('.clickable-chart-item[data-filter-type]').forEach(item => {
    item.addEventListener('click', () => {
      const filterType = item.dataset.filterType;
      const filterValue = item.dataset.filterValue || '';
      const title = item.dataset.title || '';
      const initiativeType = item.dataset.initiativeType || 'Project';
      console.log('Chart item clicked:', filterType, filterValue, title, initiativeType);
      showInitiativesModal(filterType, filterValue, title, initiativeType);
    });
  });
  
  // Add filter update functions
  window.updateDashboardFilters = () => {
    const departmentId = document.getElementById('filter-department')?.value || '';
    const itPmId = document.getElementById('filter-itpm')?.value || '';
    const teamMemberId = document.getElementById('filter-team-member')?.value || '';
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (itPmId) params.set('itPmId', itPmId);
    if (teamMemberId) params.set('teamMemberId', teamMemberId);
    location.search = params.toString();
  };
  
  window.clearDashboardFilters = () => {
    location.search = '';
  };
}

async function renderUserDashboard() {
  setActive('#user-dashboard');
  await ensureLookups();
  
  try {
    // Get current user profile to check if they're a Manager
    let currentUserProfile = null;
    let isManager = false;
    let teamMembers = [];
    try {
      currentUserProfile = await fetchJSON('/api/profile');
      isManager = currentUserProfile.type === 'Manager';
      if (isManager && currentUserProfile.teamMemberIds && currentUserProfile.teamMemberIds.length > 0) {
        teamMembers = currentUserProfile.teamMemberIds.map(id => 
          LOOKUPS.users.find(u => u.id === id)
        ).filter(Boolean);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    
    // Get filter values from URL or use defaults
    const urlParams = new URLSearchParams(location.search);
    const selectedTeamMemberId = urlParams.get('teamMemberId') || '';
    
    // Build API query string with filters
    const apiQs = new URLSearchParams();
    if (selectedTeamMemberId) apiQs.set('teamMemberId', selectedTeamMemberId);
    
    const data = await fetchJSON('/api/user-dashboard?' + apiQs.toString());
    const deptName = (id) => nameById(LOOKUPS.departments, id);
    
    // Helper function to create filter dropdown
    const createFilterDropdown = (id, label, options, value, onChange) => {
      return `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;">${label}</label>
          <select id="${id}" style="padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--surface); color: var(--text); cursor: pointer; min-width: 200px;" onchange="${onChange}">
            <option value="">All ${label}</option>
            ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`).join('')}
          </select>
        </div>
      `;
    };
    
    // Team member options (only for Managers)
    const teamMemberOptions = isManager && teamMembers.length > 0
      ? teamMembers.map(m => ({ value: m.id, label: m.name || m.email }))
      : [];
    
    app.innerHTML = `
      ${isManager && teamMemberOptions.length > 0 ? `
      <div class="card" style="margin-bottom: 24px; padding: 20px;">
        <div style="display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap;">
          ${createFilterDropdown('filter-team-member', 'Team Member', teamMemberOptions, selectedTeamMemberId, 'updateUserDashboardFilters()')}
          ${selectedTeamMemberId ? `
            <button onclick="clearUserDashboardFilters()" style="padding: 10px 16px; background: var(--gray-100); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--text);">
              Clear Filter
            </button>
          ` : ''}
        </div>
      </div>
      ` : ''}
      <div class="kpis">
        <div class="card">
          <div class="muted">My Projects</div>
          <div style="font-size:32px;font-weight:700;color: var(--brand)">${data.stats.totalProjects}</div>
        </div>
        <div class="card">
          <div class="muted">My CRs</div>
          <div style="font-size:32px;font-weight:700;color: var(--brand)">${data.stats.totalCRs}</div>
        </div>
        <div class="card">
          <div class="muted">My Tasks</div>
          <div style="font-size:32px;font-weight:700;color: var(--brand)">${data.stats.totalTasks || 0}</div>
        </div>
        <div class="card">
          <div class="muted">To-Do Items</div>
          <div style="font-size:32px;font-weight:700;color: var(--warning)">${data.stats.todosCount}</div>
        </div>
        <div class="card">
          <div class="muted">Urgent</div>
          <div style="font-size:32px;font-weight:700;color: var(--danger)">${data.stats.urgentTodos}</div>
        </div>
      </div>
      
      <div class="grid" style="margin-top:24px">
        <div class="card" style="grid-column: 1 / -1">
          <h3>📋 My To-Do List</h3>
          <div style="margin-top: 16px;">
            ${data.todos.length === 0 ? '<p class="muted">No to-do items. Great job!</p>' : ''}
            ${data.todos.map(todo => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 6px; border-left: 4px solid ${todo.priority === 'P0' ? '#ef4444' : todo.priority === 'P1' ? '#f59e0b' : '#6366f1'};">
                <div style="flex: 1;">
                  <div style="font-weight: 600; margin-bottom: 4px;">
                    <span class="priority-badge priority-${todo.priority}">${todo.priority}</span>
                    <span style="margin-left: 8px;">${todo.name}</span>
                  </div>
                  <div style="font-size: 12px; color: var(--muted);">
                    <span class="status-badge status-${todo.status?.replace(/\s+/g, '-')}">${todo.status}</span>
                    <span style="margin-left: 8px;">${todo.action}</span>
                    ${todo.dueDate ? `<span style="margin-left: 8px;">Due: ${todo.dueDate.slice(0, 10)}</span>` : ''}
                  </div>
                </div>
                <a href="${todo.link}"><button>View</button></a>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="grid" style="margin-top:24px">
        <div class="card">
          <h3>📊 My Projects</h3>
          <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
            ${data.projects.length === 0 ? '<p class="muted">No projects assigned</p>' : ''}
            ${data.projects.slice(0, 10).map(project => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
                <div style="flex: 1;">
                  <div style="font-weight: 500; margin-bottom: 4px;">${project.name}</div>
                  <div style="font-size: 12px; color: var(--muted);">
                    <span class="status-badge status-${project.status?.replace(/\s+/g, '-')}">${project.status}</span>
                    <span class="priority-badge priority-${project.priority}" style="margin-left: 8px;">${project.priority}</span>
                    <span style="margin-left: 8px;">${project.milestone || 'N/A'}</span>
                  </div>
                </div>
                <a href="#view/${project.id}"><button>View</button></a>
              </div>
            `).join('')}
            ${data.projects.length > 10 ? `<p class="muted" style="text-align: center; margin-top: 8px;">... and ${data.projects.length - 10} more</p>` : ''}
          </div>
        </div>
        
        <div class="card">
          <h3>📝 My Change Requests</h3>
          <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
            ${data.crs.length === 0 ? '<p class="muted">No CRs assigned</p>' : ''}
            ${data.crs.slice(0, 10).map(cr => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
                <div style="flex: 1;">
                  <div style="font-weight: 500; margin-bottom: 4px;">${cr.name}</div>
                  <div style="font-size: 12px; color: var(--muted);">
                    <span class="status-badge status-${cr.status?.replace(/\s+/g, '-')}">${cr.status}</span>
                    <span class="priority-badge priority-${cr.priority}" style="margin-left: 8px;">${cr.priority}</span>
                    <span style="margin-left: 8px;">${cr.milestone || 'N/A'}</span>
                  </div>
                </div>
                <a href="#view/${cr.id}"><button>View</button></a>
              </div>
            `).join('')}
            ${data.crs.length > 10 ? `<p class="muted" style="text-align: center; margin-top: 8px;">... and ${data.crs.length - 10} more</p>` : ''}
          </div>
        </div>
        
        <div class="card">
          <h3>✅ My Tasks</h3>
          <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
            ${data.tasks && data.tasks.length === 0 ? '<p class="muted">No tasks assigned</p>' : ''}
            ${data.tasks && data.tasks.slice(0, 10).map(task => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
                <div style="flex: 1;">
                  <div style="font-weight: 500; margin-bottom: 4px;">${task.name}</div>
                  <div style="font-size: 12px; color: var(--muted);">
                    <span class="status-badge status-${task.status?.replace(/\s+/g, '-')}">${task.status}</span>
                    ${task.milestone ? `<span style="margin-left: 8px;">📍 ${task.milestone}</span>` : ''}
                    ${task.endDate ? `<span style="margin-left: 8px;">Due: ${task.endDate.slice(0, 10)}</span>` : ''}
                  </div>
                  <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">
                    Project: ${task.initiativeName}
                  </div>
                </div>
                <a href="#view/${task.initiativeId}"><button>View</button></a>
              </div>
            `).join('')}
            ${data.tasks && data.tasks.length > 10 ? `<p class="muted" style="text-align: center; margin-top: 8px;">... and ${data.tasks.length - 10} more</p>` : ''}
          </div>
        </div>
      </div>
    `;
    
    // Add filter update functions
    window.updateUserDashboardFilters = () => {
      const teamMemberId = document.getElementById('filter-team-member')?.value || '';
      const params = new URLSearchParams();
      if (teamMemberId) params.set('teamMemberId', teamMemberId);
      location.search = params.toString();
    };
    
    window.clearUserDashboardFilters = () => {
      location.search = '';
    };
  } catch (error) {
    console.error('User dashboard error:', error);
    app.innerHTML = `<div class="error">Error loading dashboard: ${error.message}</div>`;
  }
}

async function renderProfile() {
  setActive('#profile');
  try {
    await ensureLookups();
    const user = await fetchJSON('/api/profile');
    
    // Get team members if user is a manager
    const teamMemberIds = user.teamMemberIds || [];
    const teamMembers = teamMemberIds.map(id => LOOKUPS.users.find(u => u.id === id)).filter(Boolean);
    
    // Get available users to add (exclude current user and existing team members)
    // Check if LOOKUPS.users exists and is an array
    const allUsers = Array.isArray(LOOKUPS.users) ? LOOKUPS.users : [];
    
    const availableUsers = allUsers.filter(u => {
      // Include user if: active (or active is undefined/null), not current user, not already in team
      const isActive = u.active !== false && u.active !== 0;
      const isNotSelf = u.id !== user.id;
      const isNotInTeam = !teamMemberIds.includes(u.id);
      return isActive && isNotSelf && isNotInTeam;
    });
    
    const isManager = user.type === 'Manager';
    
    app.innerHTML = `
      <div class="card">
        <h2>My Profile</h2>
        <form id="profile-form" class="form">
          ${formRow('Name', `<input name="name" value="${(user.name || '').replace(/"/g, '&quot;')}" required />`)}
          ${formRow('Email', `<input type="email" name="email" value="${(user.email || '').replace(/"/g, '&quot;')}" required />`)}
          ${formRow('Department', `<select name="departmentId">${LOOKUPS.departments.map(d => `<option value="${d.id}" ${d.id === user.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}</select>`)}
          ${formRow('Role', `<input type="text" value="${user.role || (user.isAdmin ? 'Admin' : 'User')}" disabled style="background: #f0f0f0;" />`)}
          ${formRow('Type', `<input type="text" value="${user.type || 'N/A'}" disabled style="background: #f0f0f0;" />`)}
          ${formRow('Status', `<input type="text" value="${user.emailActivated ? 'Activated' : 'Pending Activation'}" disabled style="background: #f0f0f0;" />`)}
          <div>
            <button class="primary" type="submit">Update Profile</button>
            <button type="button" onclick="showChangePasswordModal()">Change Password</button>
          </div>
        </form>
      </div>
      
      ${isManager ? `
      <div class="card" style="margin-top: 20px;">
        <h2>My Team Members</h2>
        <div style="margin-bottom: 16px;">
          <select id="add-team-member-select" style="margin-right: 8px; padding: 8px; min-width: 200px;">
            <option value="">Select a user to add...</option>
            ${availableUsers.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`).join('')}
          </select>
          <button class="primary" onclick="addTeamMember()">Add Team Member</button>
        </div>
        <div id="team-members-list">
          ${teamMembers.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${teamMembers.map(member => `
                  <tr>
                    <td>${escapeHtml(member.name)}</td>
                    <td>${escapeHtml(member.email || 'N/A')}</td>
                    <td>${escapeHtml(member.role || 'N/A')}</td>
                    <td>
                      <button onclick="removeTeamMember('${member.id}', '${escapeHtml(member.name)}')" style="color: var(--danger);">Remove</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <p class="muted">No team members yet. Add team members using the dropdown above.</p>
          `}
        </div>
      </div>
      ` : ''}
    `;
    
    const form = document.getElementById('profile-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        name: fd.get('name'),
        email: fd.get('email'),
        departmentId: fd.get('departmentId') || null
      };
      
      try {
        const updated = await fetchJSON('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        // Update current user
        currentUser = { ...currentUser, ...updated };
        updateNavAuth();
        
        alert('Profile updated successfully!');
        renderProfile(); // Refresh to show updated data
      } catch (error) {
        alert('Failed to update profile: ' + error.message);
      }
    };
    
    // Team member management functions (for managers)
    window.addTeamMember = async () => {
      const select = document.getElementById('add-team-member-select');
      const teamMemberId = select.value;
      
      if (!teamMemberId) {
        alert('Please select a user to add');
        return;
      }
      
      try {
        await fetchJSON('/api/profile/team-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamMemberId })
        });
        
        alert('Team member added successfully!');
        renderProfile(); // Refresh to show updated team
      } catch (error) {
        alert('Failed to add team member: ' + error.message);
      }
    };
    
    window.removeTeamMember = async (teamMemberId, memberName) => {
      if (!confirm(`Are you sure you want to remove ${memberName} from your team?`)) {
        return;
      }
      
      try {
        await fetchJSON(`/api/profile/team-members/${teamMemberId}`, {
          method: 'DELETE'
        });
        
        alert('Team member removed successfully!');
        renderProfile(); // Refresh to show updated team
      } catch (error) {
        alert('Failed to remove team member: ' + error.message);
      }
    };
  } catch (error) {
    console.error('Profile error:', error);
    app.innerHTML = `<div class="error">Error loading profile: ${error.message}</div>`;
  }
}

window.showChangePasswordModal = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <h3>Change Password</h3>
      <form id="change-password-form" class="form">
        ${formRow('Current Password', `<input type="password" name="currentPassword" required />`)}
        ${formRow('New Password', `<input type="password" name="newPassword" required minlength="6" />`)}
        ${formRow('Confirm New Password', `<input type="password" name="confirmPassword" required minlength="6" />`)}
        <div>
          <button class="primary" type="submit">Change Password</button>
          <button type="button" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  const form = document.getElementById('change-password-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      currentPassword: fd.get('currentPassword'),
      newPassword: fd.get('newPassword'),
      confirmPassword: fd.get('confirmPassword')
    };
    
    if (payload.newPassword !== payload.confirmPassword) {
      alert('New password and confirm password do not match');
      return;
    }
    
    try {
      await fetchJSON('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      alert('Password changed successfully!');
      modal.remove();
    } catch (error) {
      alert('Failed to change password: ' + error.message);
    }
  };
};

async function renderAdminUsers() {
  setActive('#admin-users');
  try {
    await ensureLookups();
    const users = await fetchJSON('/api/admin/users');
    
    app.innerHTML = `
      <div class="card">
        <h2>User Management</h2>
        <div style="margin-bottom: 16px;">
          <button class="primary" onclick="showCreateUserForm()">+ Create User</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Type</th>
              <th>Department</th>
              <th>Active</th>
              <th>Admin</th>
              <th>Email Activated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role || 'N/A'}</td>
                <td>${user.type || 'N/A'}</td>
                <td>${nameById(LOOKUPS.departments, user.departmentId) || 'N/A'}</td>
                <td>${user.active ? '✓' : '✗'}</td>
                <td>${user.isAdmin ? '✓' : '✗'}</td>
                <td>${user.emailActivated ? '✓' : '✗'}</td>
                <td>
                  <button onclick="editUser('${user.id}')" style="margin-right: 8px;">Edit</button>
                  <button onclick="resetUserPassword('${user.id}', '${user.email}')" style="margin-right: 8px;" title="Reset Password">🔑</button>
                  ${user.id !== currentUser?.id ? `<button onclick="deleteUser('${user.id}')" style="color: var(--danger);">Delete</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div id="user-form-modal" class="modal hidden">
        <div class="modal-content">
          <h3 id="user-form-title">Create User</h3>
          <form id="user-form" class="form">
            <input type="hidden" name="id" />
            <div class="form-row">
              <label>Name</label>
              <input name="name" required />
            </div>
            <div class="form-row">
              <label>Email</label>
              <input name="email" type="email" required />
            </div>
            <div class="form-row">
              <label>Password</label>
              <input name="password" type="password" />
              <small class="muted">Leave empty to keep existing password</small>
            </div>
            <div class="form-row">
              <label>Role</label>
              <select name="role">
                <option value="">None</option>
                <option value="IT">IT</option>
                <option value="Business User">Business User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div class="form-row">
              <label>Type</label>
              <select name="type">
                <option value="">None</option>
                <option value="IC (Individual Contributor)">IC (Individual Contributor)</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
            <div class="form-row">
              <label>Department</label>
              <select name="departmentId">
                <option value="">None</option>
                ${LOOKUPS.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <label>
                <input type="checkbox" name="active" checked /> Active
              </label>
            </div>
            <div class="form-row">
              <label>
                <input type="checkbox" name="isAdmin" /> Admin
              </label>
            </div>
            <div class="form-row">
              <label>
                <input type="checkbox" name="emailActivated" checked /> Email Activated
              </label>
            </div>
            <div>
              <button type="submit" class="primary">Save</button>
              <button type="button" onclick="closeUserForm()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    window.showCreateUserForm = () => {
      document.getElementById('user-form-title').textContent = 'Create User';
      document.getElementById('user-form').reset();
      document.getElementById('user-form').querySelector('input[name="id"]').value = '';
      document.getElementById('user-form-modal').classList.remove('hidden');
    };
    
    window.editUser = async (userId) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      document.getElementById('user-form-title').textContent = 'Edit User';
      const form = document.getElementById('user-form');
      form.querySelector('input[name="id"]').value = user.id;
      form.querySelector('input[name="name"]').value = user.name || '';
      form.querySelector('input[name="email"]').value = user.email || '';
      form.querySelector('select[name="role"]').value = user.role || '';
      form.querySelector('select[name="type"]').value = user.type || '';
      form.querySelector('select[name="departmentId"]').value = user.departmentId || '';
      form.querySelector('input[name="active"]').checked = user.active;
      form.querySelector('input[name="isAdmin"]').checked = user.isAdmin;
      form.querySelector('input[name="emailActivated"]').checked = user.emailActivated;
      document.getElementById('user-form-modal').classList.remove('hidden');
    };
    
    window.deleteUser = async (userId) => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      try {
        await fetchJSON(`/api/admin/users/${userId}`, { method: 'DELETE' });
        renderAdminUsers();
      } catch (e) {
        alert('Error deleting user: ' + e.message);
      }
    };
    
    window.closeUserForm = () => {
      document.getElementById('user-form-modal').classList.add('hidden');
    };
    
    window.resetUserPassword = async (userId, userEmail) => {
      const newPassword = prompt(`Enter new password for ${userEmail}:\n(Minimum 6 characters)`);
      if (!newPassword) return;
      
      if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      
      const confirmPassword = prompt('Confirm new password:');
      if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      try {
        await fetchJSON(`/api/admin/users/${userId}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword }),
        });
        alert('Password updated successfully!');
        renderAdminUsers();
      } catch (e) {
        alert('Error updating password: ' + e.message);
      }
    };
    
    document.getElementById('user-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id');
      const data = Object.fromEntries(fd.entries());
      if (!id) {
        // Create
        try {
          await fetchJSON('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          closeUserForm();
          renderAdminUsers();
        } catch (e) {
          alert('Error creating user: ' + e.message);
        }
      } else {
        // Update
        try {
          const password = data.password;
          // Remove password from regular update data
          delete data.password;
          
          // Update user info
          await fetchJSON(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          
          // If password is provided, update it separately
          if (password && password.trim()) {
            await fetchJSON(`/api/admin/users/${id}/password`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password }),
            });
          }
          
          closeUserForm();
          renderAdminUsers();
        } catch (e) {
          alert('Error updating user: ' + e.message);
        }
      }
    };
  } catch (error) {
    console.error('Admin users error:', error);
    app.innerHTML = `<div class="error">Error loading users: ${error.message}</div>`;
  }
}

async function renderAdminRoles() {
  setActive('#admin-roles');
  try {
    await ensureLookups();
    const users = await fetchJSON('/api/admin/users');
    const roles = await fetchJSON('/api/admin/roles');
    
    // Group users by role
    const usersByRole = {};
    users.forEach(user => {
      const role = user.role || 'Unassigned';
      if (!usersByRole[role]) usersByRole[role] = [];
      usersByRole[role].push(user);
    });
    
    // Sort roles by predefined order, then by user count (descending)
    const predefinedRoleOrder = ['Admin', 'SeniorManagement', 'PMO', 'IT Manager', 'IT PM', 'ITPIC', 'BusinessOwner', 'User'];
    const sortedRoles = Object.entries(usersByRole).sort(([roleA, usersA], [roleB, usersB]) => {
      const indexA = predefinedRoleOrder.indexOf(roleA);
      const indexB = predefinedRoleOrder.indexOf(roleB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return usersB.length - usersA.length; // Sort by count if not in predefined list
    });
    
    app.innerHTML = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="margin: 0;">User Access Roles Management</h2>
          <div style="font-size: 14px; color: var(--muted);">
            Total Users: <strong style="color: var(--text);">${users.length}</strong>
          </div>
        </div>
        <div class="roles-grid" style="margin-top: 24px;">
          ${sortedRoles.map(([role, roleUsers]) => `
            <div class="role-card">
              <div class="role-card-header">
                <h3 class="role-title">${escapeHtml(role)}</h3>
                <span class="role-count">${roleUsers.length}</span>
              </div>
              <div class="role-users-list">
                ${roleUsers.length > 0 ? roleUsers.map(user => `
                  <div class="role-user-item">
                    <div class="role-user-info">
                      <div class="role-user-name">${escapeHtml(user.name)}</div>
                      <div class="role-user-email">${escapeHtml(user.email || 'No email')}</div>
                    </div>
                    <select class="role-select" onchange="updateUserRole('${user.id}', this.value)" title="Change role">
                      ${roles.map(r => `<option value="${escapeHtml(r)}" ${r === role ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}
                      <option value="" ${!role ? 'selected' : ''}>Unassigned</option>
                    </select>
                  </div>
                `).join('') : `
                  <div class="role-empty-state">
                    <p style="color: var(--muted); font-size: 14px; text-align: center; padding: 20px;">No users assigned</p>
                  </div>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    window.updateUserRole = async (userId, newRole) => {
      try {
        await fetchJSON('/api/admin/users/bulk-update-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: [{ userId, role: newRole || null }] }),
        });
        renderAdminRoles();
      } catch (e) {
        alert('Error updating role: ' + e.message);
        renderAdminRoles(); // Reload to revert
      }
    };
  } catch (error) {
    console.error('Admin roles error:', error);
    app.innerHTML = `<div class="error">Error loading roles: ${error.message}</div>`;
  }
}

async function renderCRDashboard() {
  setActive('#crdashboard');
  await ensureLookups();
  
  // Get filter values from URL or use defaults
  const urlParams = new URLSearchParams(location.search);
  const selectedDepartmentId = urlParams.get('departmentId') || '';
  const selectedItManagerId = urlParams.get('itManagerId') || '';
  
  // Build API query string with filters
  const apiQs = new URLSearchParams();
  if (selectedDepartmentId) apiQs.set('departmentId', selectedDepartmentId);
  if (selectedItManagerId) apiQs.set('itManagerId', selectedItManagerId);
  
  const d = await fetchJSON('/api/cr-dashboard?' + apiQs.toString());
  
  // Create simple bar charts
  const createBarChart = (data, labelKey, valueKey, title, clickable = false) => {
    if (!data || data.length === 0) {
      return `<div class="card"><h3>${title}</h3><p class="muted">No data available</p></div>`;
    }
    const max = Math.max(...data.map(item => item[valueKey] || 0), 1);
    return `
      <div class="card">
        <h3>${title}</h3>
        <div style="margin-top: 16px;">
          ${data.map(item => {
            const percentage = ((item[valueKey] || 0) / max) * 100;
            const statusClass = item[labelKey]?.replace(/\s+/g, '-') || '';
            const filterValue = item[labelKey] || '';
            const clickableStyle = clickable ? 'cursor: pointer;' : '';
            const clickableClass = clickable ? 'clickable-chart-item' : '';
            const dataAttrs = clickable ? `data-filter-type="${labelKey}" data-filter-value="${filterValue.replace(/"/g, '&quot;')}" data-title="${title}: ${filterValue.replace(/"/g, '&quot;')}" data-initiative-type="CR"` : '';
            return `
              <div class="${clickableClass}" ${dataAttrs} style="display: flex; align-items: center; margin-bottom: 12px; ${clickableStyle}">
                <div style="width: 120px; font-size: 12px; color: var(--muted);">${item[labelKey] || 'N/A'}</div>
                <div style="flex: 1; margin: 0 12px;">
                  <div style="background: #f1f5f9; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: ${statusClass.includes('Live') ? '#3b82f6' : statusClass.includes('At-Risk') ? '#f59e0b' : statusClass.includes('Delayed') ? '#ef4444' : '#6366f1'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                  </div>
                </div>
                <div style="width: 40px; text-align: right; font-weight: 600; font-size: 14px;">${item[valueKey] || 0}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };
  
  // Helper function to create filter dropdown
  const createFilterDropdown = (id, label, options, value, onChange) => {
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;">${label}</label>
        <select id="${id}" style="padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--surface); color: var(--text); cursor: pointer; min-width: 200px;" onchange="${onChange}">
          <option value="">All ${label}</option>
          ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select>
      </div>
    `;
  };
  
  // Get filter options
  const departmentOptions = LOOKUPS.departments.map(d => ({ value: d.id, label: d.name }));
  const itManagerOptions = LOOKUPS.users
    .filter(u => {
      // Only include active users with role: IT Manager
      if (u.active === false) return false;
      const role = (u.role || '').toLowerCase().trim();
      return role === 'it manager';
    })
    .map(u => ({ value: u.id, label: u.name || u.email }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  app.innerHTML = `
    <div class="card" style="margin-bottom: 24px; padding: 20px;">
      <div style="display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap;">
        ${createFilterDropdown('filter-department-cr', 'Department', departmentOptions, selectedDepartmentId, 'updateCRDashboardFilters()')}
        ${createFilterDropdown('filter-itmanager-cr', 'IT Manager', itManagerOptions, selectedItManagerId, 'updateCRDashboardFilters()')}
        ${(selectedDepartmentId || selectedItManagerId) ? `
          <button onclick="clearCRDashboardFilters()" style="padding: 10px 16px; background: var(--gray-100); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--text);">
            Clear Filters
          </button>
        ` : ''}
      </div>
    </div>
    <div class="kpis">
      <div class="card clickable-card" data-filter-type="all" data-filter-value="" data-title="All CRs" data-initiative-type="CR" style="cursor: pointer;">
        <div class="muted">Total CRs</div>
        <div style="font-size:32px;font-weight:700;color: var(--brand)">${d.crs || 0}</div>
      </div>
      <div class="card clickable-card" data-filter-type="status" data-filter-value="LIVE" data-title="Live CRs" data-initiative-type="CR" style="cursor: pointer;">
        <div class="muted">Live CRs</div>
        <div style="font-size:32px;font-weight:700;color: var(--success)">${d.liveCount || 0}</div>
      </div>
      <div class="card">
        <div class="muted">Avg Age (Days)</div>
        <div style="font-size:32px;font-weight:700;color: var(--warning)">${d.avgAgeSinceCreated || 0}</div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      ${createBarChart(d.byStatus || [], 'status', 'c', 'Status Distribution', true)}
      ${createBarChart(d.byPriority || [], 'priority', 'c', 'Priority Distribution', true)}
      ${createBarChart(d.byMilestone || [], 'milestone', 'c', 'Milestone Distribution', true)}
    </div>
    <div class="grid" style="margin-top:24px">
      <div class="card">
        <h3>CR Aging (Days Since Created)</h3>
        <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
          ${(d.crAging || []).slice(0, 20).map(cr => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 4px;">${cr.name || 'Unnamed CR'}</div>
                <div style="font-size: 12px; color: var(--muted);">
                  <span class="status-badge status-${(cr.status || '').replace(/\s+/g, '-')}">${cr.status || 'N/A'}</span>
                  <span style="margin-left: 8px;">${cr.milestone || 'N/A'}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 600; color: var(--warning);">${cr.daysSinceCreated || 0} days</span>
              </div>
            </div>
          `).join('')}
          ${(!d.crAging || d.crAging.length === 0) ? '<p class="muted">No CR aging data available</p>' : ''}
        </div>
      </div>
      <div class="card">
        <h3>Department Distribution</h3>
        <div style="margin-top: 16px;">
          ${(d.byDepartment || []).map(item => {
            const deptName = nameById(LOOKUPS.departments, item.departmentId);
            const deptId = item.departmentId || '';
            return `
              <div class="clickable-chart-item" data-filter-type="departmentId" data-filter-value="${deptId}" data-title="Department: ${deptName}" data-initiative-type="CR" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px; cursor: pointer;">
                <span style="font-weight: 500;">${deptName || item.departmentId || 'N/A'}</span>
                <span style="font-weight: 600;">${item.c || 0}</span>
              </div>
            `;
          }).join('')}
          ${(!d.byDepartment || d.byDepartment.length === 0) ? '<p class="muted">No department data available</p>' : ''}
        </div>
      </div>
      ${d.weeklyTrendData && d.weeklyTrendData.length > 0 ? `
      <div class="card" style="margin-top: 24px; grid-column: 1 / -1;">
        <h3>📈 CR Weekly Trend</h3>
        <div style="margin-top: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid var(--border);">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: var(--text);">Week (Mon-Fri)</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: var(--text);">New CRs</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: var(--text);">CRs Went Live</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: var(--text);">Total CRs</th>
              </tr>
            </thead>
            <tbody>
              ${d.weeklyTrendData.map((week, index) => {
                const isLatest = index === d.weeklyTrendData.length - 1;
                return `
                  <tr style="border-bottom: 1px solid var(--border); ${isLatest ? 'background: #f0f9ff; font-weight: 600;' : ''}">
                    <td style="padding: 12px; color: var(--text);">${week.weekLabel || `${week.weekStart} - ${week.weekEnd}`}</td>
                    <td style="padding: 12px; text-align: center; color: var(--brand);">${week.newCRs || 0}</td>
                    <td style="padding: 12px; text-align: center; color: var(--success);">${week.liveCRs || 0}</td>
                    <td style="padding: 12px; text-align: center; color: var(--text);">${week.totalCRs || 0}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: var(--muted);">
          <strong>Note:</strong> Week shows Monday-Friday range. "New CRs" = CRs created that week. "CRs Went Live" = CRs that became LIVE that week. "Total CRs" = Cumulative count of all CRs by end of week.
        </div>
      </div>
      ` : ''}
    </div>
  `;
  
  // Add event listeners for clickable cards
  document.querySelectorAll('.clickable-card[data-filter-type]').forEach(card => {
    card.addEventListener('click', () => {
      const filterType = card.dataset.filterType;
      const filterValue = card.dataset.filterValue || '';
      const title = card.dataset.title || '';
      const initiativeType = card.dataset.initiativeType || 'Project';
      console.log('CR Card clicked:', filterType, filterValue, title, initiativeType);
      showInitiativesModal(filterType, filterValue, title, initiativeType);
    });
  });
  
  // Add event listeners for chart items
  document.querySelectorAll('.clickable-chart-item[data-filter-type]').forEach(item => {
    item.addEventListener('click', () => {
      const filterType = item.dataset.filterType;
      const filterValue = item.dataset.filterValue || '';
      const title = item.dataset.title || '';
      const initiativeType = item.dataset.initiativeType || 'Project';
      console.log('CR Chart item clicked:', filterType, filterValue, title, initiativeType);
      showInitiativesModal(filterType, filterValue, title, initiativeType);
    });
  });
  
  // Add filter update functions
  window.updateCRDashboardFilters = () => {
    const departmentId = document.getElementById('filter-department-cr')?.value || '';
    const itManagerId = document.getElementById('filter-itmanager-cr')?.value || '';
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (itManagerId) params.set('itManagerId', itManagerId);
    location.search = params.toString();
  };
  
  window.clearCRDashboardFilters = () => {
    location.search = '';
  };
}

function renderAuth() {
  setActive('#auth');
  app.innerHTML = `
    <div class="card auth-card">
      <h2>Welcome</h2>
      <p class="muted">Sign in to manage Projects & Change Requests.</p>
      <div class="tabs">
        <button class="tab active" data-tab="login">Login</button>
        <button class="tab" data-tab="register">Register</button>
        <button class="tab" data-tab="forgot">Forgot Password</button>
      </div>
      <div id="auth-views">
        <form id="form-login" class="form auth-view" data-view="login">
          <div class="form-row">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div class="form-row">
            <label>Password</label>
            <input name="password" type="password" required />
          </div>
          <button type="submit" class="primary">Login</button>
        </form>
        <form id="form-register" class="form auth-view hidden" data-view="register">
          <div class="form-row">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div class="form-row">
            <label>Email</label>
            <input name="email" type="email" required />
            <small class="muted">Note: @energi-up.com, @kpn-corp.com, and @cemindo.com emails will receive activation link. Other domains require admin approval.</small>
          </div>
          <div class="form-row">
            <label>Password</label>
            <input name="password" type="password" required minlength="6" />
          </div>
          <div class="form-row">
            <label>Confirm Password</label>
            <input name="confirmPassword" type="password" required minlength="6" />
          </div>
          <button type="submit" class="primary">Register</button>
        </form>
        <form id="form-forgot" class="form auth-view hidden" data-view="forgot">
          <div class="form-row">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <button type="submit" class="primary">Send reset link</button>
        </form>
      </div>
    </div>
  `;

  const tabs = document.querySelectorAll('.tabs .tab');
  const views = document.querySelectorAll('.auth-view');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.tab;
      views.forEach(v => {
        v.classList.toggle('hidden', v.dataset.view !== view);
      });
    };
  });

  document.getElementById('form-login').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Login failed');
      return;
    }
    setToken(json.token);
    currentUser = json.user;
    updateNavAuth();
    location.hash = '#user-dashboard';
  };

  document.getElementById('form-register').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const password = fd.get('password');
    const confirmPassword = fd.get('confirmPassword');
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    const body = Object.fromEntries(fd.entries());
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Registration failed');
      return;
    }
    if (json.requiresActivation) {
      if (json.activationMethod === 'email') {
        alert('Registration successful! Please check your email to activate your account before logging in.');
      } else {
        alert('Registration successful! Your account is pending admin approval. You will be notified once your account is activated.');
      }
    } else {
      alert('Registration successful. You can now log in.');
    }
    tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === 'login');
    });
    views.forEach(v => {
      v.classList.toggle('hidden', v.dataset.view !== 'login');
    });
  };

  document.getElementById('form-forgot').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || 'Request failed');
      return;
    }
    const json = await res.json();
    alert(json.message || 'If an account exists with this email, a password reset link has been sent.');
  };
}

// Protected routes that require authentication
const PROTECTED_ROUTES = ['#list', '#crlist', '#dashboard', '#crdashboard', '#new', '#user-dashboard', '#admin', '#admin-users', '#admin-roles'];
const ADMIN_ROUTES = ['#admin', '#admin-users', '#admin-roles'];

async function requireAuth() {
  const token = getToken();
  if (!token) {
    location.hash = '#auth';
    return false;
  }
  const user = await getCurrentUser();
  if (!user) {
    clearUser();
    location.hash = '#auth';
    return false;
  }
  return true;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    alert('Admin access required');
    location.hash = '#user-dashboard';
    return false;
  }
  return true;
}

// Load and display notifications
async function loadNotifications() {
  try {
    const notifications = await fetchJSON('/api/notifications');
    const unreadCount = notifications.filter(n => !n.read).length;
    updateNotificationBadge(unreadCount);
    renderNotifications(notifications);
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }
}

// Update notification badge count
function updateNotificationBadge(count) {
  const badge = document.getElementById('notifications-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Render notifications in dropdown
function renderNotifications(notifications) {
  const list = document.getElementById('notifications-list');
  if (!list) return;
  
  if (notifications.length === 0) {
    list.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">No notifications</p>';
    return;
  }
  
  list.innerHTML = notifications.map(n => {
    const timeAgo = n.createdAt ? getTimeAgo(new Date(n.createdAt)) : '';
    return `
      <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
        <div class="notification-content">
          <div class="notification-title">${escapeHtml(n.title)}</div>
          <div class="notification-message">${escapeHtml(n.message)}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
        ${n.initiativeId ? `
          <a href="#view/${n.initiativeId}" class="notification-link" onclick="document.getElementById('notifications-dropdown').classList.add('hidden');">
            View →
          </a>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // Add click handlers
  list.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.classList.contains('notification-link')) return;
      
      const notificationId = item.dataset.id;
      if (!item.classList.contains('read')) {
        try {
          await fetchJSON(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
          item.classList.remove('unread');
          item.classList.add('read');
          loadNotifications(); // Refresh count
        } catch (e) {
          console.error('Failed to mark notification as read:', e);
        }
      }
    });
  });
}

// Get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function updateNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  const navProfileMenu = document.getElementById('nav-profile-menu');
  const navNotifications = document.getElementById('nav-notifications');
  const profileMenuName = document.getElementById('profile-menu-name');
  const adminLinks = document.querySelectorAll('.admin-link');
  const protectedLinks = document.querySelectorAll('.protected-link');
  
  const user = currentUser;
  if (user) {
    // Show profile menu and notifications, hide login link
    if (navProfileMenu) {
      navProfileMenu.classList.remove('hidden');
      if (profileMenuName) {
        profileMenuName.textContent = user.name;
      }
    }
    if (navNotifications) {
      navNotifications.classList.remove('hidden');
      loadNotifications(); // Load notifications when user is logged in
    }
    if (navAuth) {
      navAuth.classList.add('hidden');
    }
    // Show protected links when logged in
    protectedLinks.forEach(link => link.classList.remove('hidden'));
    // Show admin links if user is admin
    if (user.isAdmin) {
      adminLinks.forEach(link => link.classList.remove('hidden'));
    } else {
      adminLinks.forEach(link => link.classList.add('hidden'));
    }
  } else {
    // Hide profile menu and notifications, show login link
    if (navProfileMenu) {
      navProfileMenu.classList.add('hidden');
    }
    if (navNotifications) {
      navNotifications.classList.add('hidden');
    }
    if (navAuth) {
      navAuth.classList.remove('hidden');
      navAuth.textContent = '🔐 Login';
      navAuth.href = '#auth';
    }
    // Hide protected links when not logged in
    protectedLinks.forEach(link => link.classList.add('hidden'));
    adminLinks.forEach(link => link.classList.add('hidden'));
  }
}

window.logout = function() {
  clearUser();
  updateNavAuth();
  location.hash = '#auth';
};

async function router() {
  if (!app) {
    console.error('App element not found!');
    return;
  }
  
  // Default route: if logged in, go to dashboard; otherwise, go to auth
  let defaultRoute = '#auth';
  const token = getToken();
  if (token) {
    const user = await getCurrentUser();
    if (user) {
      defaultRoute = '#user-dashboard';
    }
  }
  
  const h = location.hash || defaultRoute;
  if (!location.hash) {
    location.hash = defaultRoute;
    return;
  }
  console.log('Router called with hash:', h);
  
  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some(route => h.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => h.startsWith(route));
  
  if (isProtected && !(await requireAuth())) {
    return;
  }
  
  if (isAdminRoute && !(await requireAdmin())) {
    return;
  }
  
  try {
    if (h.startsWith('#auth')) return renderAuth();
    if (h.startsWith('#activate/')) return renderActivate(h.split('/')[1]);
    if (h.startsWith('#reset-password/')) return renderResetPassword(h.split('/')[1]);
    if (h.startsWith('#user-dashboard')) return renderUserDashboard();
    if (h.startsWith('#admin-users')) return renderAdminUsers();
    if (h.startsWith('#admin-roles')) return renderAdminRoles();
    if (h.startsWith('#profile')) return renderProfile();
    if (h.startsWith('#new')) return renderNew();
    if (h.startsWith('#edit/')) return renderEdit(h.split('/')[1]);
    if (h.startsWith('#view/')) return renderView(h.split('/')[1]);
    if (h.startsWith('#crdashboard')) return renderCRDashboard();
    if (h.startsWith('#dashboard')) return renderDashboard();
    if (h.startsWith('#crlist')) return renderCRList();
    if (h.startsWith('#list')) return renderList();
    // Default to auth if no route matches
    location.hash = '#auth';
  } catch (error) {
    console.error('Router error:', error);
    if (app) {
      app.innerHTML = `<div class="error">Error loading page: ${error.message}</div>`;
    }
  }
}

// Initialize router
window.addEventListener('hashchange', router);
// Run router on page load
router();

// Handle activation route
async function renderActivate(token) {
  try {
    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    if (!res.ok) {
      app.innerHTML = `<div class="card"><h2>Activation Failed</h2><p class="error">${json.error || 'Invalid activation token'}</p><a href="#auth"><button>Go to Login</button></a></div>`;
      return;
    }
    app.innerHTML = `<div class="card"><h2>Account Activated</h2><p>${json.message || 'Your account has been activated successfully!'}</p><a href="#auth"><button class="primary">Go to Login</button></a></div>`;
  } catch (e) {
    app.innerHTML = `<div class="card"><h2>Activation Error</h2><p class="error">${e.message}</p><a href="#auth"><button>Go to Login</button></a></div>`;
  }
}

// Handle password reset route
async function renderResetPassword(token) {
  setActive('#auth');
  app.innerHTML = `
    <div class="card auth-card">
      <h2>Reset Password</h2>
      <p class="muted">Enter your new password below.</p>
      <form id="form-reset-password" class="form">
        <div class="form-row">
          <label>New Password</label>
          <input name="password" type="password" required minlength="6" />
          <small class="muted">Password must be at least 6 characters</small>
        </div>
        <div class="form-row">
          <label>Confirm New Password</label>
          <input name="confirmPassword" type="password" required minlength="6" />
        </div>
        <button type="submit" class="primary">Reset Password</button>
        <div style="margin-top: 16px;">
          <a href="#auth" style="color: var(--primary);">Back to Login</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-reset-password').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const password = fd.get('password');
    const confirmPassword = fd.get('confirmPassword');
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Password reset failed');
        return;
      }
      app.innerHTML = `
        <div class="card">
          <h2>Password Reset Successful</h2>
          <p>${json.message || 'Your password has been reset successfully. You can now log in with your new password.'}</p>
          <a href="#auth"><button class="primary">Go to Login</button></a>
        </div>
      `;
    } catch (e) {
      alert('Error resetting password: ' + e.message);
    }
  };
}

// Initialize
(async () => {
  const user = await getCurrentUser();
  updateNavAuth();
  
  // Initialize profile menu dropdown
  const profileMenuBtn = document.getElementById('profile-menu-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileMenuBtn && profileDropdown) {
    profileMenuBtn.onclick = (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (profileMenuBtn && profileDropdown && !profileMenuBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.add('hidden');
      }
    });
  }
  
  // Initialize notification button and dropdown
  const notificationsBtn = document.getElementById('notifications-btn');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  const markAllReadBtn = document.getElementById('mark-all-read-btn');
  
  if (notificationsBtn && notificationsDropdown) {
    notificationsBtn.onclick = (e) => {
      e.stopPropagation();
      notificationsDropdown.classList.toggle('hidden');
      // Load notifications when opening dropdown
      if (!notificationsDropdown.classList.contains('hidden')) {
        loadNotifications();
      }
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (notificationsBtn && notificationsDropdown && 
          !notificationsBtn.contains(e.target) && 
          !notificationsDropdown.contains(e.target)) {
        notificationsDropdown.classList.add('hidden');
      }
    });
  }
  
  // Mark all as read button
  if (markAllReadBtn) {
    markAllReadBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await fetchJSON('/api/notifications/read-all', { method: 'PUT' });
        loadNotifications(); // Refresh notifications
      } catch (e) {
        console.error('Failed to mark all notifications as read:', e);
      }
    };
  }
  
  router();
})();
