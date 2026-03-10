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

// Indonesia Public Holidays (2024-2026)
// Format: 'YYYY-MM-DD'
const INDONESIA_HOLIDAYS = [
  // 2024
  '2024-01-01', // New Year's Day
  '2024-02-10', // Chinese New Year
  '2024-02-11', // Chinese New Year (observed)
  '2024-03-11', // Nyepi Day
  '2024-03-29', // Good Friday
  '2024-04-10', // Idul Fitri
  '2024-04-11', // Idul Fitri
  '2024-05-01', // Labor Day
  '2024-05-09', // Ascension Day of Jesus Christ
  '2024-05-23', // Vesak Day
  '2024-06-01', // Pancasila Day
  '2024-06-17', // Idul Adha
  '2024-07-07', // Islamic New Year
  '2024-08-17', // Independence Day
  '2024-09-16', // Prophet Muhammad's Birthday
  '2024-12-25', // Christmas
  '2024-12-26', // Christmas (observed)
  // 2025
  '2025-01-01', // New Year's Day
  '2025-01-29', // Chinese New Year
  '2025-03-29', // Nyepi Day
  '2025-03-31', // Good Friday
  '2025-03-31', // Idul Fitri
  '2025-04-01', // Idul Fitri
  '2025-05-01', // Labor Day
  '2025-05-29', // Ascension Day of Jesus Christ
  '2025-05-12', // Vesak Day
  '2025-06-01', // Pancasila Day
  '2025-06-07', // Idul Adha
  '2025-06-26', // Islamic New Year
  '2025-08-17', // Independence Day
  '2025-09-05', // Prophet Muhammad's Birthday
  '2025-12-25', // Christmas
  '2025-12-26', // Christmas (observed)
  // 2026
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year
  '2026-03-19', // Nyepi Day
  '2026-03-20', // Good Friday
  '2026-03-20', // Idul Fitri
  '2026-03-21', // Idul Fitri
  '2026-05-01', // Labor Day
  '2026-05-14', // Ascension Day of Jesus Christ
  '2026-05-01', // Vesak Day
  '2026-06-01', // Pancasila Day
  '2026-05-27', // Idul Adha
  '2026-06-15', // Islamic New Year
  '2026-08-17', // Independence Day
  '2026-08-25', // Prophet Muhammad's Birthday
  '2026-12-25', // Christmas
];

// Helper function to format date as YYYY-MM-DD
const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Check if a date is a weekend (Saturday = 6, Sunday = 0)
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Check if a date is a public holiday
const isHoliday = (date) => {
  const dateKey = formatDateKey(date);
  return INDONESIA_HOLIDAYS.includes(dateKey);
};

// Check if a date is a working day (not weekend and not holiday)
const isWorkingDay = (date) => {
  return !isWeekend(date) && !isHoliday(date);
};

// Calculate working days between two dates (inclusive of start, exclusive of end)
// Returns the number of working days
const calculateWorkingDays = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalize to midnight to compare only dates
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (start >= end) return 0;
  
  let workingDays = 0;
  const current = new Date(start);
  
  // Iterate through each day from start to end (exclusive)
  while (current < end) {
    if (isWorkingDay(current)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
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

// Column width management (persist per viewType)
function getColumnWidths(viewType = 'list') {
  const key = `pm_column_widths_${viewType}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

function saveColumnWidths(viewType, widths) {
  const key = `pm_column_widths_${viewType}`;
  localStorage.setItem(key, JSON.stringify(widths));
}

function applyColumnWidths(viewType, tableSelector) {
  const table = document.querySelector(tableSelector);
  if (!table) return;
  const widths = getColumnWidths(viewType);
  if (!widths) return;

  // Apply to headers (by data-col)
  table.querySelectorAll('thead th[data-col]').forEach(th => {
    const col = th.dataset.col;
    const w = widths[col];
    if (w) th.style.width = `${w}px`;
  });

  // Apply to body cells (by matching class name like "col-description")
  Object.entries(widths).forEach(([colClass, w]) => {
    if (!w) return;
    table.querySelectorAll(`tbody td.${colClass}`).forEach(td => {
      td.style.width = `${w}px`;
    });
  });
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
      'col-start-date': true,
      'col-create-date': true,
      'col-end-date': true,
      'col-plan-start-date': false,
      'col-plan-end-date': false,
      'col-age-created-to-start': false,
      'col-cycle-time': false,
      'col-description': false,
      'col-impact': true,
      'col-remark': true,
      'col-doc': true,
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
    'col-start-date': true,
    'col-create-date': true,
    'col-end-date': true,
    'col-plan-start-date': false,
    'col-plan-end-date': false,
    'col-age-created-to-start': false,
    'col-cycle-time': false,
    'col-description': false,
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

// File compression function - handles images, PDF, Word, Excel
async function compressFile(file, maxSizeKB = 300) {
  const fileSizeKB = file.size / 1024;
  
  // If file is already under the limit, return as-is
  if (fileSizeKB <= maxSizeKB) {
    return file;
  }
  
  // For images (JPEG, PNG), use canvas compression
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (imageTypes.includes(file.type.toLowerCase())) {
    return await compressImage(file, maxSizeKB);
  }
  
  // For PDF files - attempt compression using CompressionStream API if available
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    console.log(`[PDF Compression] Attempting to compress PDF: ${file.name} (${fileSizeKB.toFixed(2)} KB)`);
    
    if ('CompressionStream' in window) {
      try {
        const stream = file.stream();
        const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));
        const chunks = [];
        const reader = compressedStream.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const compressedBlob = new Blob(chunks, { type: 'application/pdf' });
        const compressedSizeKB = compressedBlob.size / 1024;
        const reductionPercent = ((fileSizeKB - compressedSizeKB) / fileSizeKB * 100).toFixed(1);
        
        console.log(`[PDF Compression] Result: ${compressedSizeKB.toFixed(2)} KB (${reductionPercent}% reduction)`);
        
        // Use compressed version if it's actually smaller (even if still above limit)
        // This helps reduce file size even if we can't get it under 300KB
        if (compressedSizeKB < fileSizeKB) {
          console.log(`[PDF Compression] Using compressed version (${compressedSizeKB.toFixed(2)} KB vs original ${fileSizeKB.toFixed(2)} KB)`);
          return new File([compressedBlob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
        } else {
          console.log(`[PDF Compression] Compression didn't reduce size, using original`);
        }
      } catch (error) {
        console.warn('[PDF Compression] Compression failed, using original:', error);
      }
    } else {
      console.warn('[PDF Compression] CompressionStream API not available in this browser');
    }
    
    // Note: Scanned PDFs are particularly difficult to compress because they contain
    // already-compressed images. Client-side compression has limited effectiveness.
    // For better results, consider server-side compression or pre-compressing PDFs.
    return file;
  }
  
  // For Word and Excel files - client-side compression is very limited
  // These formats are binary and require specialized tools
  // We'll return the file as-is and let the user know if it's too large
  const officeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const isOfficeFile = officeTypes.includes(file.type) || 
    /\.(doc|docx|xls|xlsx)$/i.test(file.name);
  
  if (isOfficeFile) {
    // Return as-is - these formats are difficult to compress client-side
    // User will be informed if file exceeds limit
    return file;
  }
  
  // For other file types, return as-is
  return file;
}

// Image compression function - targets 300KB
async function compressImage(file, maxSizeKB = 300) {
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
        
        // Try different quality levels to get under target size (300KB)
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file); // Fallback to original
              return;
            }
            
            const sizeKB = blob.size / 1024;
            if (sizeKB <= maxSizeKB || quality <= 0.1) {
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
      img.onerror = () => resolve(file); // Fallback to original on error
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file); // Fallback to original on error
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
  // Normalize status to lowercase for case-insensitive CSS matching
  const statusClass = i.status?.toLowerCase().replace(/\s+/g, '-') || '';
  const priorityClass = i.priority || '';
  
  // Default visibility if not provided
  if (!colVisibility) colVisibility = getDefaultColumns('list');
  
  // Calculate Age Created to Start: from Create Date to Start Date (working days only)
  let ageCreatedToStart = null;
  if (i.createdAt && i.startDate) {
    const createDate = new Date(i.createdAt);
    const startDate = new Date(i.startDate);
    if (!isNaN(createDate.getTime()) && !isNaN(startDate.getTime())) {
      ageCreatedToStart = calculateWorkingDays(createDate, startDate);
    }
  }
  
  // Calculate Cycle Time (Age Start to End): from Start Date to End Date (or current date if End Date is empty) - working days only
  let cycleTime = null;
  if (i.startDate) {
    const startDate = new Date(i.startDate);
    if (!isNaN(startDate.getTime())) {
      if (i.endDate) {
        const endDate = new Date(i.endDate);
        if (!isNaN(endDate.getTime())) {
          // For end date, we want to include the end date itself, so add 1 day
          const endDateInclusive = new Date(endDate);
          endDateInclusive.setDate(endDateInclusive.getDate() + 1);
          cycleTime = calculateWorkingDays(startDate, endDateInclusive);
        }
      } else {
        // If no end date, calculate from start date to current date (inclusive of today)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        cycleTime = calculateWorkingDays(startDate, tomorrow);
      }
    }
  }
  
  // CR Timeline display - removed (CR dates no longer used)
  const timelineCell = '';

  // Expand/collapse support for long text cells (Description + Remark)
  const makeExpandable = (text, maxLen, colClass) => {
    const raw = (text || '').toString();
    const safe = escapeHtml(raw);
    const short = safe.length > maxLen ? `${safe.slice(0, maxLen)}...` : safe;
    const needsToggle = safe.length > maxLen;
    const rowKey = escapeHtml(String(i.id || ''));

    if (!needsToggle) {
      return `<td class="${colClass}" style="display: ${colVisibility[colClass] !== false ? 'table-cell' : 'none'}" title="${safe}">${safe}</td>`;
    }

    return `<td class="${colClass} cell-expandable" data-row="${rowKey}" style="display: ${colVisibility[colClass] !== false ? 'table-cell' : 'none'}">
      <span class="cell-short">${short}</span>
      <span class="cell-full">${safe}</span>
      <button type="button" class="cell-toggle" data-action="toggle-cell" aria-label="Toggle full text">More</button>
    </td>`;
  };
  
  return `<tr class="status-${statusClass}">
    <td class="col-ticket" style="display: ${colVisibility['col-ticket'] !== false ? 'table-cell' : 'none'}">${i.ticket || ''}</td>
    <td class="col-name" style="display: ${colVisibility['col-name'] !== false ? 'table-cell' : 'none'}"><strong><a href="#view/${i.id}">${i.name}</a></strong></td>
    <td class="col-priority" style="display: ${colVisibility['col-priority'] !== false ? 'table-cell' : 'none'}"><span class="priority-badge priority-${priorityClass}">${i.priority}</span></td>
    <td class="col-status" style="display: ${colVisibility['col-status'] !== false ? 'table-cell' : 'none'}"><span class="status-badge status-${statusClass}">${i.status}</span></td>
    <td class="col-milestone" style="display: ${colVisibility['col-milestone'] !== false ? 'table-cell' : 'none'}">${i.milestone}</td>
    <td class="col-department" style="display: ${colVisibility['col-department'] !== false ? 'table-cell' : 'none'}">${dep}</td>
    <td class="col-owner" style="display: ${colVisibility['col-owner'] !== false ? 'table-cell' : 'none'}">${bo}</td>
    <td class="col-pic" style="display: ${colVisibility['col-pic'] !== false ? 'table-cell' : 'none'}">${itpic}</td>
    <td class="col-start-date" style="display: ${colVisibility['col-start-date'] !== false ? 'table-cell' : 'none'}">${i.startDate?.slice(0,10) || ''}</td>
    <td class="col-create-date" style="display: ${colVisibility['col-create-date'] !== false ? 'table-cell' : 'none'}">${i.createdAt?.slice(0,10) || ''}</td>
    <td class="col-end-date" style="display: ${colVisibility['col-end-date'] !== false ? 'table-cell' : 'none'}">${i.endDate?.slice(0,10) || ''}</td>
    <td class="col-plan-start-date" style="display: ${colVisibility['col-plan-start-date'] !== false ? 'table-cell' : 'none'}">${i.planStartDate?.slice(0,10) || ''}</td>
    <td class="col-plan-end-date" style="display: ${colVisibility['col-plan-end-date'] !== false ? 'table-cell' : 'none'}">${i.planEndDate?.slice(0,10) || ''}</td>
    <td class="col-age-created-to-start" style="display: ${colVisibility['col-age-created-to-start'] !== false ? 'table-cell' : 'none'}">${ageCreatedToStart !== null ? ageCreatedToStart + ' days' : ''}</td>
    <td class="col-cycle-time" style="display: ${colVisibility['col-cycle-time'] !== false ? 'table-cell' : 'none'}">${cycleTime !== null ? cycleTime + ' days' : ''}</td>
    ${makeExpandable(i.description || '', 80, 'col-description')}
    <td class="col-impact" style="display: ${colVisibility['col-impact'] !== false ? 'table-cell' : 'none'}" title="${i.businessImpact || ''}">${(i.businessImpact || '').toString().slice(0,100)}${(i.businessImpact || '').length > 100 ? '...' : ''}</td>
    ${makeExpandable(i.remark || '', 80, 'col-remark')}
    <td class="col-doc" style="display: ${colVisibility['col-doc'] !== false ? 'table-cell' : 'none'}" title="${doc}">${doc.slice(0, 40)}${doc.length > 40 ? '...' : ''}</td>
    ${timelineCell}
    <td class="col-actions">
      <button data-id="${i.id}" class="view" style="margin-right: 8px;">View</button>
      <button data-id="${i.id}" class="edit" style="margin-right: 8px; color: var(--brand);">Edit</button>
      ${currentUser?.isAdmin ? `<button data-id="${i.id}" class="delete" style="color: var(--danger);">Delete</button>` : ''}
    </td>
  </tr>`;
}

// Keep a CSS variable in sync with the actual header height so sticky table headers
// sit just below the main page header and never collide with it.
function updateHeaderHeightVar() {
  const headerEl = document.querySelector('header');
  if (!headerEl) return;
  const height = headerEl.offsetHeight || 0;
  document.documentElement.style.setProperty('--app-header-height', `${height}px`);
}

// Initialize once on load and keep in sync on resize.
window.addEventListener('load', updateHeaderHeightVar);
window.addEventListener('resize', () => {
  // Use rAF to avoid layout thrash during continuous resize
  window.requestAnimationFrame(updateHeaderHeightVar);
});

// Enhance wide table UX: add subtle left/right shadows on horizontal overflow so
// users can immediately tell the table is scrollable.
function initScrollableTables() {
  document.querySelectorAll('.table-wrapper').forEach(wrapper => {
    const el = wrapper;
    const updateShadows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const canScrollRight = scrollWidth - clientWidth - scrollLeft > 1;
      const canScrollLeft = scrollLeft > 1;
      wrapper.classList.toggle('has-left-shadow', canScrollLeft);
      wrapper.classList.toggle('has-right-shadow', canScrollRight);
    };

    el.addEventListener('scroll', updateShadows);
    // Run once on init in case the table overflows immediately
    updateShadows();
  });
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
  // Use project-specific search key to keep Project and CR searches separate
  const q = urlParams.get('project_q') || '';
  // Parse multi-value filters (comma-separated)
  const parseFilter = (key) => {
    const val = urlParams.get(key);
    return val ? val.split(',').filter(v => v) : [];
  };
  
  // Parse date filters (format: operator:date, e.g., "gte:2024-01-01")
  const parseDateFilter = (key) => {
    const val = urlParams.get(key);
    if (!val) return null;
    const parts = val.split(':');
    if (parts.length === 2) {
      return { operator: parts[0], date: parts[1] };
    }
    return null;
  };
  
  const filter = {
    departmentId: parseFilter('project_departmentId'),
    priority: parseFilter('project_priority'),
    status: parseFilter('project_status'),
    milestone: parseFilter('project_milestone'),
    itPicId: parseFilter('project_itPicId'),
    itPmId: parseFilter('project_itPmId'),
    itManagerId: parseFilter('project_itManagerId'),
    createdAt: parseDateFilter('project_createdAt'),
    startDate: parseDateFilter('project_startDate'),
    endDate: parseDateFilter('project_endDate')
  };
  const sortParam = urlParams.get('project_sort') || '';
  
  // Build API query string with multi-value filters
  const apiQs = new URLSearchParams();
  apiQs.set('type', 'Project'); // Only fetch Projects for Project List
  if (q) apiQs.set('q', q);
  if (filter.departmentId.length) apiQs.set('departmentId', filter.departmentId.join(','));
  if (filter.priority.length) apiQs.set('priority', filter.priority.join(','));
  if (filter.status.length) apiQs.set('status', filter.status.join(','));
  if (filter.milestone.length) apiQs.set('milestone', filter.milestone.join(','));
  if (filter.itPicId.length) apiQs.set('itPicId', filter.itPicId.join(','));
  if (filter.itPmId.length) apiQs.set('itPmId', filter.itPmId.join(','));
  
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
  // Apply client-side filtering for date filters
  if (filter.createdAt) {
    const filterDate = new Date(filter.createdAt.date);
    data = data.filter(i => {
      if (!i.createdAt) return false;
      const itemDate = new Date(i.createdAt);
      if (filter.createdAt.operator === 'eq') {
        return itemDate.toDateString() === filterDate.toDateString();
      } else if (filter.createdAt.operator === 'gte') {
        return itemDate >= filterDate;
      } else if (filter.createdAt.operator === 'lte') {
        return itemDate <= filterDate;
      }
      return true;
    });
  }
  if (filter.startDate) {
    const filterDate = new Date(filter.startDate.date);
    data = data.filter(i => {
      if (!i.startDate) return false;
      const itemDate = new Date(i.startDate);
      if (filter.startDate.operator === 'eq') {
        return itemDate.toDateString() === filterDate.toDateString();
      } else if (filter.startDate.operator === 'gte') {
        return itemDate >= filterDate;
      } else if (filter.startDate.operator === 'lte') {
        return itemDate <= filterDate;
      }
      return true;
    });
  }
  if (filter.endDate) {
    const filterDate = new Date(filter.endDate.date);
    data = data.filter(i => {
      if (!i.endDate) return false;
      const itemDate = new Date(i.endDate);
      if (filter.endDate.operator === 'eq') {
        return itemDate.toDateString() === filterDate.toDateString();
      } else if (filter.endDate.operator === 'gte') {
        return itemDate >= filterDate;
      } else if (filter.endDate.operator === 'lte') {
        return itemDate <= filterDate;
      }
      return true;
    });
  }

  // Apply client-side filtering for IT Manager (initiative has itManagerIds)
  if (filter.itManagerId.length > 0) {
    data = data.filter(i => {
      const raw = i.itManagerIds || i.itManagerId || [];
      const ids = Array.isArray(raw)
        ? raw
        : String(raw).split(',').map(v => v.trim()).filter(Boolean);
      return filter.itManagerId.some(sel => ids.includes(sel));
    });
  }

  // Build user subsets for filters (role/type based)
  const norm = (s) => String(s || '').trim().toLowerCase();
  const roleNorm = (u) => norm(u?.role).replace(/\s+/g, '');
  const typeNorm = (u) => norm(u?.type).replace(/\s+/g, '');

  const isITRole = (u) => roleNorm(u) === 'it';
  const isManagerType = (u) => typeNorm(u) === 'manager';

  // 1) IT Manager: ROLE = IT and TYPE = Manager
  const itManagerFilterUsers = (LOOKUPS.users || []).filter(u => isITRole(u) && isManagerType(u));

  // 2) IT PIC: ROLE = IT
  const itPicFilterUsers = (LOOKUPS.users || []).filter(u => isITRole(u));

  // 3) IT PM: (ROLE = IT and TYPE = Manager) OR ROLE = Admin OR ROLE = IT - PM
  const itPmFilterUsers = (LOOKUPS.users || []).filter(u => {
    const r = roleNorm(u);
    const rRaw = norm(u?.role);
    if (r === 'admin') return true;
    if (r === 'itpm') return true;
    if (rRaw === 'it - pm' || rRaw === 'it pm' || rRaw === 'it-pm') return true;
    if (isITRole(u) && isManagerType(u)) return true;
    return false;
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
    { key: 'startDate', class: 'col-start-date', label: 'Actual Start Date', sortable: true },
    { key: 'createdAt', class: 'col-create-date', label: 'Create Date', sortable: true },
    { key: 'endDate', class: 'col-end-date', label: 'Actual End Date', sortable: true },
    { key: 'planStartDate', class: 'col-plan-start-date', label: 'Plan Start Date', sortable: true },
    { key: 'planEndDate', class: 'col-plan-end-date', label: 'Plan End Date', sortable: true },
    { key: 'ageCreatedToStart', class: 'col-age-created-to-start', label: 'Age Created to Start', sortable: false },
    { key: 'cycleTime', class: 'col-cycle-time', label: 'Cycle Time (Age Start to End)', sortable: false },
    { key: 'description', class: 'col-description', label: 'Description', sortable: true },
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
      startDate: 'Actual Start Date',
      endDate: 'Actual End Date',
      planStartDate: 'Plan Start Date',
      planEndDate: 'Plan End Date',
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
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fItPic">
              IT PIC ${filter.itPicId.length > 0 ? `(${filter.itPicId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fItPic">
              ${itPicFilterUsers.map(u => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${u.id}" ${filter.itPicId.includes(u.id) ? 'checked' : ''}>
                  ${u.name}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fItPm">
              IT PM ${filter.itPmId.length > 0 ? `(${filter.itPmId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fItPm">
              ${itPmFilterUsers.map(u => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${u.id}" ${filter.itPmId.includes(u.id) ? 'checked' : ''}>
                  ${u.name}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fItManager">
              IT Manager ${filter.itManagerId.length > 0 ? `(${filter.itManagerId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fItManager">
              ${itManagerFilterUsers.map(u => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${u.id}" ${filter.itManagerId.includes(u.id) ? 'checked' : ''}>
                  ${u.name}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="date-filters-group" id="date-filters">
          <div class="date-filter-wrapper">
            <button class="multi-select-btn" data-filter="fCreateDate">
              <span class="filter-label">Create Date</span> ${filter.createdAt ? '<span class="filter-active">✓</span>' : ''}
            </button>
            <div class="date-filter-dropdown" id="dropdown-fCreateDate">
              <div class="date-filter-content">
                <select id="createDate-operator" class="date-operator-select">
                  <option value="eq" ${filter.createdAt?.operator === 'eq' ? 'selected' : ''}>Equal</option>
                  <option value="gte" ${filter.createdAt?.operator === 'gte' ? 'selected' : ''}>≥ Greater or Equal</option>
                  <option value="lte" ${filter.createdAt?.operator === 'lte' ? 'selected' : ''}>≤ Less or Equal</option>
                </select>
                <input type="date" id="createDate-value" value="${filter.createdAt?.date || ''}" class="date-input">
              </div>
            </div>
          </div>
          <div class="date-filter-wrapper">
            <button class="multi-select-btn" data-filter="fStartDate">
              <span class="filter-label">Actual Start Date</span> ${filter.startDate ? '<span class="filter-active">✓</span>' : ''}
            </button>
            <div class="date-filter-dropdown" id="dropdown-fStartDate">
              <div class="date-filter-content">
                <select id="startDate-operator" class="date-operator-select">
                  <option value="eq" ${filter.startDate?.operator === 'eq' ? 'selected' : ''}>Equal</option>
                  <option value="gte" ${filter.startDate?.operator === 'gte' ? 'selected' : ''}>≥ Greater or Equal</option>
                  <option value="lte" ${filter.startDate?.operator === 'lte' ? 'selected' : ''}>≤ Less or Equal</option>
                </select>
                <input type="date" id="startDate-value" value="${filter.startDate?.date || ''}" class="date-input">
              </div>
            </div>
          </div>
          <div class="date-filter-wrapper">
            <button class="multi-select-btn" data-filter="fEndDate">
              <span class="filter-label">Actual End Date</span> ${filter.endDate ? '<span class="filter-active">✓</span>' : ''}
            </button>
            <div class="date-filter-dropdown" id="dropdown-fEndDate">
              <div class="date-filter-content">
                <select id="endDate-operator" class="date-operator-select">
                  <option value="eq" ${filter.endDate?.operator === 'eq' ? 'selected' : ''}>Equal</option>
                  <option value="gte" ${filter.endDate?.operator === 'gte' ? 'selected' : ''}>≥ Greater or Equal</option>
                  <option value="lte" ${filter.endDate?.operator === 'lte' ? 'selected' : ''}>≤ Less or Equal</option>
                </select>
                <input type="date" id="endDate-value" value="${filter.endDate?.date || ''}" class="date-input">
              </div>
            </div>
          </div>
        </div>
        <div class="action-group">
          <button id="btn-columns" onclick="showColumnSettings('list')" title="Column Settings" class="icon-btn">⚙️</button>
          <button id="apply-filters-btn" class="primary" onclick="applyFilters()">Apply Filters</button>
          <a href="#new/Project"><button class="primary">+ New Initiative</button></a>
        </div>
      </div>
    </div>
    <div class="table-wrapper">
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
    </div>
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

  // Initialize horizontal scroll affordance for the main initiatives table.
  initScrollableTables();
  
  // Multi-select dropdown handlers (for checkbox filters)
  document.querySelectorAll('.multi-select-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const filterId = btn.dataset.filter;
      const dropdown = document.getElementById(`dropdown-${filterId}`);
      if (!dropdown) return;
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
      }
    };
  });
  
  // Date filter dropdown handlers
  document.querySelectorAll('.date-filter-wrapper .multi-select-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const filterId = btn.dataset.filter;
      const dropdown = document.getElementById(`dropdown-${filterId}`);
      if (!dropdown) return;
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
        document.body.classList.add('dropdown-open');
      }
    };
  });
  
  // Close dropdowns when clicking outside or on overlay
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select-wrapper') && !e.target.closest('.date-filter-wrapper') && !e.target.closest('.multi-select-dropdown') && !e.target.closest('.date-filter-dropdown')) {
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
    }
  });
  
  // Close dropdowns on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
    }
  });
  
  window.applyFilters = function() {
    const searchVal = document.getElementById('search').value;
    const url = new URL(location.href);
    
    // Update search with project-specific key
    if (searchVal) url.searchParams.set('project_q', searchVal);
    else url.searchParams.delete('project_q');
    
    // Get selected values from each multi-select
    const getSelectedValues = (filterId) => {
      const checkboxes = document.querySelectorAll(`#dropdown-${filterId} input[type="checkbox"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    };
    
    // Use project-specific filter keys
    const filterMap = {
      'fDepartment': 'project_departmentId',
      'fPriority': 'project_priority',
      'fStatus': 'project_status',
      'fMilestone': 'project_milestone',
      'fItPic': 'project_itPicId',
      'fItPm': 'project_itPmId',
      'fItManager': 'project_itManagerId'
    };
    
    Object.entries(filterMap).forEach(([filterId, paramKey]) => {
      const values = getSelectedValues(filterId);
      if (values.length > 0) {
        url.searchParams.set(paramKey, values.join(','));
      } else {
        url.searchParams.delete(paramKey);
      }
    });
    
    // Handle date filters
    const createDateOp = document.getElementById('createDate-operator')?.value;
    const createDateVal = document.getElementById('createDate-value')?.value;
    if (createDateOp && createDateVal) {
      url.searchParams.set('project_createdAt', `${createDateOp}:${createDateVal}`);
    } else {
      url.searchParams.delete('project_createdAt');
    }
    
    const startDateOp = document.getElementById('startDate-operator')?.value;
    const startDateVal = document.getElementById('startDate-value')?.value;
    if (startDateOp && startDateVal) {
      url.searchParams.set('project_startDate', `${startDateOp}:${startDateVal}`);
    } else {
      url.searchParams.delete('project_startDate');
    }
    
    const endDateOp = document.getElementById('endDate-operator')?.value;
    const endDateVal = document.getElementById('endDate-value')?.value;
    if (endDateOp && endDateVal) {
      url.searchParams.set('project_endDate', `${endDateOp}:${endDateVal}`);
    } else {
      url.searchParams.delete('project_endDate');
    }
    
    history.pushState({}, '', url);
    renderList();
  };
  
  // Search auto-apply while typing (debounced)
  let searchDebounceTimer = null;
  const searchEl = document.getElementById('search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        // Auto-apply search changes; other filters still require Apply Filters button.
        window.applyFilters();
      }, 350);
    });

    // Enter key forces immediate apply
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        window.applyFilters();
      }
    });
  }
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
  
  // Add resize handles to ALL columns (not just sortable) - Project List
  document.querySelectorAll('thead th').forEach(th => {
    // Skip actions column
    if (th.classList.contains('col-actions')) return;
    const resizer = document.createElement('span');
    resizer.className = 'col-resize';
    resizer.title = 'Drag to resize column';
    th.appendChild(resizer);
    
    // Only add sorting behavior to sortable columns
    if (th.classList.contains('sortable')) {
      th.onclick = (e) => {
        if (e.target === resizer || e.target.closest('.col-resize')) return; // ignore when resizing
        const key = th.dataset.key;
        const url = new URL(location.href);
        const current = url.searchParams.get('project_sort') || '';
        const [curKey, curDir] = current.split(':');
        
        // 3-state cycle: none → asc → desc → none (default)
        let nextSort = '';
        if (curKey !== key) {
          // Different column clicked, start with ascending
          nextSort = `${key}:asc`;
        } else if (curDir === 'asc') {
          // Same column, currently ascending → go to descending
          nextSort = `${key}:desc`;
        } else if (curDir === 'desc') {
          // Same column, currently descending → remove sort (default)
          nextSort = '';
        } else {
          // No current sort on this column → start ascending
          nextSort = `${key}:asc`;
        }
        
        if (nextSort) {
          url.searchParams.set('project_sort', nextSort);
        } else {
          url.searchParams.delete('project_sort');
        }
        history.pushState({}, '', url);
        renderList();
      };
    }
    
    // Resize behavior for ALL columns
    let startX = 0; let startWidth = 0;
    // Use pointer events + window listeners (more reliable than document.onpointermove)
    resizer.onpointerdown = (ev) => {
      ev.preventDefault();
      ev.stopPropagation(); // Prevent sorting when resizing
      resizer.setPointerCapture?.(ev.pointerId);
      startX = ev.clientX;
      startWidth = th.offsetWidth;
      const colClass = th.dataset.col;
      const table = th.closest('table');
      if (!table || !colClass) return;
      const viewType = 'list';

      // Debug: verify the handler is firing
      console.log('[column-resize] start', viewType, colClass, startWidth);

      const onMove = (mv) => {
        mv.preventDefault();
        const dx = mv.clientX - startX;
        const newW = Math.max(80, startWidth + dx);
        console.log('[column-resize] move', colClass, 'dx:', dx, 'newW:', newW);
        // Set width on header with min/max to force it
        th.style.width = newW + 'px';
        th.style.minWidth = newW + 'px';
        th.style.maxWidth = newW + 'px';
        // Set width on all matching cells
        const cells = table.querySelectorAll(`tbody td.${colClass}`);
        console.log('[column-resize] found', cells.length, 'cells for', colClass);
        cells.forEach(td => {
          td.style.width = newW + 'px';
          td.style.minWidth = newW + 'px';
          td.style.maxWidth = newW + 'px';
        });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        console.log('[column-resize] end', colClass, 'final width:', th.offsetWidth);
        // Persist width
        const widths = getColumnWidths(viewType) || {};
        const w = Math.max(80, th.offsetWidth || 0);
        widths[colClass] = w;
        saveColumnWidths(viewType, widths);
      };

      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
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

  // Apply persisted column widths for Project List table
  applyColumnWidths('list', '#initiatives-table');

  // Expand/collapse handler for Description/Remark cells (event delegation)
  const initiativesTable = document.getElementById('initiatives-table');
  if (initiativesTable) {
    initiativesTable.addEventListener('click', (e) => {
      const btn = e.target.closest?.('button.cell-toggle');
      if (!btn) return;
      e.preventDefault();
      const td = btn.closest('td.cell-expandable');
      if (!td) return;
      const expanded = td.classList.toggle('expanded');
      btn.textContent = expanded ? 'Less' : 'More';
    });
  }
}

function formRow(label, inputHtml) {
  return `<div class="form-row"><label>${label}</label><div>${inputHtml}</div></div>`;
}

// Helper function to create searchable single-select dropdown
function createSearchableSelect(name, options, selectedValue = '', placeholder = 'Select...', allowNone = false) {
  const selectedOption = options.find(opt => opt.id === selectedValue);
  const displayText = selectedOption ? selectedOption.name : placeholder;
  
  return `
    <div class="searchable-select-wrapper">
      <button type="button" class="searchable-select-btn" data-field="${name}">
        <span class="searchable-select-text">${displayText}</span>
        <span class="searchable-select-arrow">▼</span>
      </button>
      <div class="searchable-select-dropdown" id="searchable-dropdown-${name}">
        <div class="searchable-select-search">
          <input type="text" class="searchable-select-input" placeholder="Search..." data-field="${name}">
        </div>
        <div class="searchable-select-options">
          ${allowNone ? `<div class="searchable-select-option ${!selectedValue ? 'selected' : ''}" data-value="" data-field="${name}">None</div>` : ''}
          ${options.map(opt => `
            <div class="searchable-select-option ${selectedValue === opt.id ? 'selected' : ''}" data-value="${opt.id}" data-field="${name}">${opt.name}</div>
          `).join('')}
        </div>
      </div>
      <input type="hidden" name="${name}" value="${selectedValue || ''}">
    </div>
  `;
}

// Helper function to create multi-select dropdown for forms with search
function createMultiSelect(name, options, selectedValues = []) {
  const selectedSet = new Set(Array.isArray(selectedValues) ? selectedValues : [selectedValues].filter(Boolean));
  const selectedIds = Array.from(selectedSet);
  
  return `
    <div class="multi-select-wrapper">
      <button type="button" class="multi-select-btn" data-field="${name}">
        ${selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select...'}
      </button>
      <div class="multi-select-dropdown" id="dropdown-${name}">
        <div class="multi-select-search">
          <input type="text" class="multi-select-search-input" placeholder="Search..." data-field="${name}">
        </div>
        <div class="multi-select-options">
          ${options.map(opt => `
            <label class="multi-select-option" data-name="${(opt.name || '').toLowerCase()}">
              <input type="checkbox" value="${opt.id}" ${selectedSet.has(opt.id) ? 'checked' : ''} data-field="${name}">
              ${opt.name}
            </label>
          `).join('')}
        </div>
      </div>
      <input type="hidden" name="${name}" value="${selectedIds.join(',')}">
    </div>
  `;
}

// Initialize multi-select dropdowns in forms
function initializeMultiSelects() {
  // Multi-select button click
  document.querySelectorAll('.multi-select-btn[data-field]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const fieldName = btn.dataset.field;
      const dropdown = document.getElementById(`dropdown-${fieldName}`);
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
      document.querySelectorAll('.searchable-select-dropdown').forEach(d => d.classList.remove('open'));
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
        // Focus search input
        const searchInput = dropdown.querySelector('.multi-select-search-input');
        if (searchInput) setTimeout(() => searchInput.focus(), 10);
      }
    };
  });
  
  // Multi-select search functionality
  document.querySelectorAll('.multi-select-search-input').forEach(input => {
    input.onclick = (e) => e.stopPropagation();
    input.oninput = (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const fieldName = input.dataset.field;
      const options = document.querySelectorAll(`#dropdown-${fieldName} .multi-select-option`);
      options.forEach(opt => {
        const name = opt.dataset.name || opt.textContent.toLowerCase();
        opt.style.display = name.includes(searchTerm) ? 'flex' : 'none';
      });
    };
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select-wrapper')) {
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
    }
    if (!e.target.closest('.searchable-select-wrapper')) {
      document.querySelectorAll('.searchable-select-dropdown').forEach(d => d.classList.remove('open'));
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
  
  // Initialize searchable single-select dropdowns
  document.querySelectorAll('.searchable-select-btn[data-field]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const fieldName = btn.dataset.field;
      const dropdown = document.getElementById(`searchable-dropdown-${fieldName}`);
      const isOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
      document.querySelectorAll('.searchable-select-dropdown').forEach(d => d.classList.remove('open'));
      
      // Toggle current dropdown
      if (!isOpen) {
        dropdown.classList.add('open');
        // Focus search input
        const searchInput = dropdown.querySelector('.searchable-select-input');
        if (searchInput) setTimeout(() => searchInput.focus(), 10);
      }
    };
  });
  
  // Searchable select search functionality
  document.querySelectorAll('.searchable-select-input').forEach(input => {
    input.onclick = (e) => e.stopPropagation();
    input.oninput = (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const fieldName = input.dataset.field;
      const options = document.querySelectorAll(`#searchable-dropdown-${fieldName} .searchable-select-option`);
      options.forEach(opt => {
        const name = opt.textContent.toLowerCase();
        opt.style.display = name.includes(searchTerm) ? 'block' : 'none';
      });
    };
  });
  
  // Searchable select option click
  document.querySelectorAll('.searchable-select-option').forEach(opt => {
    opt.onclick = (e) => {
      e.stopPropagation();
      const fieldName = opt.dataset.field;
      const value = opt.dataset.value;
      const text = opt.textContent.trim();
      
      // Update hidden input
      const hiddenInput = document.querySelector(`.searchable-select-wrapper input[type="hidden"][name="${fieldName}"]`);
      if (hiddenInput) hiddenInput.value = value;
      
      // Update button text
      const btn = document.querySelector(`.searchable-select-btn[data-field="${fieldName}"]`);
      if (btn) {
        const textSpan = btn.querySelector('.searchable-select-text');
        if (textSpan) textSpan.textContent = text;
      }
      
      // Update selected state
      const allOptions = document.querySelectorAll(`#searchable-dropdown-${fieldName} .searchable-select-option`);
      allOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      // Close dropdown and clear search
      const dropdown = document.getElementById(`searchable-dropdown-${fieldName}`);
      if (dropdown) {
        dropdown.classList.remove('open');
        const searchInput = dropdown.querySelector('.searchable-select-input');
        if (searchInput) {
          searchInput.value = '';
          allOptions.forEach(o => o.style.display = 'block');
        }
      }
    };
  });
}

// Filter users by role for specific fields
function filterUsersByRole(users, roleFilter) {
  return users.filter(u => {
    const role = (u.role || '').toLowerCase().trim();
    const type = (u.type || '').toLowerCase().trim();
    const isAdmin = u.isAdmin === true || u.isAdmin === 1 || role === 'admin';
    
    switch (roleFilter) {
      case 'businessOwner':
        // Business User and Admin role
        return role === 'business user' || isAdmin;
      case 'itPic':
        // IT, IT - PM, and Admin role
        return role === 'it' || role === 'it - pm' || role === 'it-pm' || role === 'itpm' || isAdmin;
      case 'itManager':
        // Admin role OR IT role with Manager type
        return isAdmin || (role === 'it' && type === 'manager');
      case 'itPm':
        // IT - PM, IT PM, and Admin role
        return role === 'it - pm' || role === 'it-pm' || role === 'itpm' || role === 'it pm' || isAdmin;
      default:
        return true;
    }
  });
}

function commonFields(initiative = null, defaultType = 'Project', nameLabel = 'Initiative Name') {
  const option = (value, label, selected) => `<option value="${value}" ${selected ? 'selected' : ''}>${label}</option>`;
  
  // Filter users for specific fields
  const businessOwnerUsers = filterUsersByRole(LOOKUPS.users, 'businessOwner');
  const itPicUsers = filterUsersByRole(LOOKUPS.users, 'itPic');
  const itManagerUsers = filterUsersByRole(LOOKUPS.users, 'itManager');
  const itPmUsers = filterUsersByRole(LOOKUPS.users, 'itPm');
  
  // Determine selected type: from initiative if exists, otherwise from defaultType
  const selectedType = initiative ? initiative.type : defaultType;
  
  const fields = [
    formRow('Type', `<select name="type" id="typeSelect" required><option value="Project" ${selectedType === 'Project' ? 'selected' : ''}>Project</option><option value="CR" ${selectedType === 'CR' ? 'selected' : ''}>CR</option></select>`),
    formRow(`<span id="nameLabelText">${nameLabel}</span>`, `<input name="name" id="nameInput" value="${initiative ? (initiative.name || '').replace(/"/g, '&quot;') : ''}" required />`),
    formRow('Description', `<textarea name="description" class="long-text" required>${initiative ? (initiative.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>`),
    formRow('Business Impact', `<textarea name="businessImpact" class="long-text" required>${initiative ? (initiative.businessImpact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>`),
    formRow('Priority', `<select name="priority">${option('P0', 'P0', initiative?.priority === 'P0')}${option('P1', 'P1', initiative?.priority === 'P1')}${option('P2', 'P2', !initiative || initiative.priority === 'P2')}</select>`),
    formRow('Business Owner / Requestor', createSearchableSelect('businessOwnerId', businessOwnerUsers, initiative?.businessOwnerId || '', 'Select...')),
    formRow('Business Users', createMultiSelect('businessUserIds', LOOKUPS.users, initiative?.businessUserIds || [])),
    formRow('Department', createSearchableSelect('departmentId', LOOKUPS.departments, initiative?.departmentId || '', 'Select...')),
    formRow('IT PIC', createMultiSelect('itPicIds', itPicUsers, initiative?.itPicIds || (initiative?.itPicId ? [initiative.itPicId] : []))),
    formRow('IT PM', createSearchableSelect('itPmId', itPmUsers, initiative?.itPmId || '', 'Select...', true)),
    formRow('IT Manager', createMultiSelect('itManagerIds', itManagerUsers, initiative?.itManagerIds || [])),
    formRow('Status', `<select name="status">${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s => option(s, s, initiative?.status === s)).join('')}</select>`),
    formRow('Milestone', `<select name="milestone">${['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'].map(m => option(m, m, initiative?.milestone === m)).join('')}</select>`),
    formRow('Actual Start Date', `<input type="date" name="startDate" value="${initiative?.startDate?.slice(0,10) || ''}" />`),
    formRow('Actual End Date', `<input type="date" name="endDate" value="${initiative?.endDate?.slice(0,10) || ''}" />`),
    formRow('Plan Start Date', `<input type="date" name="planStartDate" value="${initiative?.planStartDate?.slice(0,10) || ''}" required />`),
    formRow('Plan End Date', `<input type="date" name="planEndDate" value="${initiative?.planEndDate?.slice(0,10) || ''}" />`),
    formRow('Remark', `<textarea name="remark" class="long-text">${initiative ? (initiative.remark || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>`),
    formRow('Project Doc Link', `<input name="documentationLink" type="url" value="${initiative?.documentationLink || ''}" />`),
    formRow('Documents', `<input type="file" name="documents" id="documents" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip,.rar" />
      <div id="filePreview" style="margin-top: 10px;"></div>
      <small style="color: #666;">You can select multiple files. Files larger than 300KB will be automatically compressed (images) or may require manual compression (PDF, Word, Excel).</small>`)
  ];
  console.log('commonFields: Plan Start Date and Plan End Date fields included:', fields.some(f => f.includes('Plan Start Date') || f.includes('Plan End Date')));
  return fields.join('');
}

function crFields() {
  // CR dates have been removed - no longer used
  return `<div id="crFields"></div>`;
}

async function renderNew(defaultType = 'Project') {
  setActive('#new');
  await ensureLookups();
  
  const isCR = defaultType === 'CR';
  const pageTitle = isCR ? 'New CR' : 'New Initiative';
  const nameLabel = isCR ? 'CR Name' : 'Initiative Name';
  const cancelHref = isCR ? '#crlist' : '#list';
  
  app.innerHTML = `
    <div class="card">
      <h2>${pageTitle}</h2>
      <form id="f" class="form">
        ${commonFields(null, defaultType, nameLabel)}
        <div class="form-actions">
          <button type="button" class="btn-fixed" onclick="location.hash='${cancelHref}'">Cancel</button>
          <button type="submit" class="btn-fixed primary">Create</button>
        </div>
      </form>
    </div>
  `;

  // Initialize horizontal scroll affordance for the CR table.
  initScrollableTables();
  
  // Initialize multi-select dropdowns
  initializeMultiSelects();
  
  const f = document.getElementById('f');
  const typeEl = f.querySelector('select[name="type"]');
  const nameLabelEl = document.getElementById('nameLabelText');
  const pageTitleEl = document.querySelector('.card h2');
  
  // Function to update labels based on type
  const updateLabelsForType = () => {
    const isCR = typeEl.value === 'CR';
    if (nameLabelEl) nameLabelEl.textContent = isCR ? 'CR Name' : 'Initiative Name';
    if (pageTitleEl) pageTitleEl.textContent = isCR ? 'New CR' : 'New Initiative';
  };
  
  typeEl.onchange = updateLabelsForType;
  updateLabelsForType(); // Apply initial state
  
  // Compression function for images - targets 300KB
  async function compressImage(file, maxSizeKB = 300) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          let quality = 0.9;
          
          // Calculate initial dimensions to get close to target size
          const maxDimension = 2000; // Max width/height
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
          
          // Try to compress to target size
          const tryCompress = (q) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                resolve(file); // Fallback to original
                return;
              }
              
              const sizeKB = blob.size / 1024;
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                // Create a new File object with the compressed blob
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                // Reduce quality and try again
                tryCompress(Math.max(0.1, q - 0.1));
              }
            }, file.type, q);
          };
          
          tryCompress(quality);
        };
        img.onerror = () => resolve(file); // Fallback to original on error
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file); // Fallback to original on error
      reader.readAsDataURL(file);
    });
  }
  
  // Compress file if needed - targets 300KB
  async function compressFileIfNeeded(file) {
    const maxSizeKB = 300;
    return await compressFile(file, maxSizeKB);
  }
  
  // File upload handling
  const fileInput = document.getElementById('documents');
  const filePreview = document.getElementById('filePreview');
  const selectedFiles = [];
  const compressionInfo = []; // Track compression info (parallel array to selectedFiles)
  
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      selectedFiles.length = 0;
      compressionInfo.length = 0;
      
      // Process and compress files
      filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Processing files...</strong></div>';
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalSize = file.size;
        const compressed = await compressFileIfNeeded(file);
        selectedFiles.push(compressed);
        
        // Track compression info - show even if compression happened but didn't reach target
        if (compressed.size < originalSize) {
          // Compression occurred, even if minimal
          const reductionPercent = ((originalSize - compressed.size) / originalSize * 100).toFixed(1);
          compressionInfo.push({ 
            original: originalSize, 
            compressed: compressed.size, 
            reduced: true,
            reductionPercent: reductionPercent
          });
          console.log(`[File Compression] ${file.name}: ${(originalSize/1024).toFixed(2)} KB → ${(compressed.size/1024).toFixed(2)} KB (${reductionPercent}% reduction)`);
        } else if (compressed.size === originalSize && originalSize > 300 * 1024) {
          // File couldn't be compressed (e.g., already optimized)
          compressionInfo.push({ 
            original: originalSize, 
            compressed: compressed.size, 
            reduced: false, 
            note: 'File already optimized - minimal compression possible' 
          });
          console.log(`[File Compression] ${file.name}: No compression possible (already optimized)`);
        } else {
          compressionInfo.push(null);
        }
      }
      
      // Display file preview
      if (selectedFiles.length > 0) {
        filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Selected files:</strong></div>' +
          selectedFiles.map((file, index) => {
            const compInfo = compressionInfo[index];
            let sizeDisplay = '';
            if (compInfo && compInfo.reduced) {
              const reduction = ((compInfo.original - compInfo.compressed) / compInfo.original * 100).toFixed(1);
              sizeDisplay = `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #28a745;">(compressed from ${(compInfo.original / 1024).toFixed(1)} KB, ${reduction}% reduction)</span></span>`;
            } else if (compInfo && !compInfo.reduced && compInfo.note) {
              sizeDisplay = `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #ff9800;">(${compInfo.note})</span></span>`;
            } else {
              sizeDisplay = `<span style="color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>`;
            }
            
            // Warn if file is still too large
            const warning = file.size > 300 * 1024 
              ? `<span style="color: #ff6b6b; font-size: 0.9em; margin-left: 8px;">⚠️ File exceeds 300KB${compInfo && compInfo.note ? ' - ' + compInfo.note.toLowerCase() : ' - may need manual compression'}</span>`
              : '';
            
            return `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-radius: 4px;">
                <span>📄 ${file.name}</span>
                ${sizeDisplay}
                ${warning}
                <button type="button" onclick="removeFile(${index})" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
              </div>
            `;
          }).join('');
      } else {
        filePreview.innerHTML = '';
      }
    };
    
    // Global function to remove files
    window.removeFile = (index) => {
      // Remove from arrays (parallel arrays stay in sync)
      selectedFiles.splice(index, 1);
      compressionInfo.splice(index, 1);
      
      // Update file input
      const dt = new DataTransfer();
      selectedFiles.forEach(file => dt.items.add(file));
      fileInput.files = dt.files;
      
      // Rebuild preview display
      if (selectedFiles.length > 0) {
        filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Selected files:</strong></div>' +
          selectedFiles.map((file, newIndex) => {
            const compInfo = compressionInfo[newIndex];
            const sizeDisplay = compInfo 
              ? `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #28a745;">(compressed from ${(compInfo.original / 1024).toFixed(1)} KB)</span></span>`
              : `<span style="color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>`;
            
            // Warn if file is still too large
            const warning = file.size > 300 * 1024 
              ? `<span style="color: #ff6b6b; font-size: 0.9em; margin-left: 8px;">⚠️ File exceeds 300KB - may need manual compression</span>`
              : '';
            
            return `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-radius: 4px;">
                <span>📄 ${file.name}</span>
                ${sizeDisplay}
                ${warning}
                <button type="button" onclick="removeFile(${newIndex})" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
              </div>
            `;
          }).join('');
      } else {
        filePreview.innerHTML = '';
      }
    };
  }
  
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
      planStartDate: obj.planStartDate || null,
      planEndDate: obj.planEndDate || null,
      remark: obj.remark || null,
      documentationLink: obj.documentationLink || null
    };
    // CR dates removed - no longer used
    if (obj.type === 'CR') {
      payload.cr = {};
    }
    try {
      const result = await fetchJSON('/api/initiatives', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload) 
      });
      
      const initiativeId = result.id;
      
      // Upload documents if any files were selected
      if (fileInput && selectedFiles.length > 0) {
        const token = getToken();
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('initiativeId', initiativeId);
          
          const uploadRes = await fetch('/api/documents', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
          });
          
          if (!uploadRes.ok) {
            const errorText = await uploadRes.text().catch(() => '');
            throw new Error(`Failed to upload ${file.name}: ${errorText || uploadRes.statusText}`);
          }
          
          return uploadRes.json();
        });
        
        try {
          await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading documents:', uploadError);
          alert(`Initiative created successfully, but some documents failed to upload: ${uploadError.message}`);
        }
      }
      
      // Redirect to appropriate list based on type
      if (obj.type === 'CR') {
        location.hash = '#crlist';
        renderCRList();
      } else {
        location.hash = '#list';
        renderList();
      }
    } catch (e) {
      alert(e.message);
    }
  };
}

async function renderView(id) {
  await ensureLookups();
  await getCurrentUser();
  const i = await fetchJSON('/api/initiatives/' + id);
  
  // Set active nav based on initiative type
  setActive(i.type === 'CR' ? '#crlist' : '#list');
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
  
  // Sort tasks by Milestone and Start Date (Ascending)
  // Milestone order: None -> Business Requirement -> Tech Assessment -> Planning -> Development -> Testing -> Live Preparation
  const milestoneOrder = {
    '': 0,
    'none': 0,
    'business requirement': 1,
    'tech assessment': 2,
    'planning': 3,
    'development': 4,
    'testing': 5,
    'live preparation': 6,
    'live': 6,
    'preparation': 0
  };
  
  tasks.sort((a, b) => {
    // First sort by milestone
    const aMilestone = (a.milestone || '').toLowerCase();
    const bMilestone = (b.milestone || '').toLowerCase();
    const aMilestoneOrder = milestoneOrder[aMilestone] !== undefined ? milestoneOrder[aMilestone] : 999;
    const bMilestoneOrder = milestoneOrder[bMilestone] !== undefined ? milestoneOrder[bMilestone] : 999;
    
    if (aMilestoneOrder !== bMilestoneOrder) {
      return aMilestoneOrder - bMilestoneOrder;
    }
    
    // Then sort by Start Date (Ascending)
    const aStartDate = a.startDate ? new Date(a.startDate) : new Date('9999-12-31'); // Put tasks without dates at the end
    const bStartDate = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
    return aStartDate - bStartDate;
  });

  // Calculate % Completion based on task statuses (fallback to initiative status when no tasks)
  const statusToPercent = {
    // Task status enum values
    'not started': 0,
    'in progress': 50,
    'at risk': 25,
    'cancel': 100,
    'done': 100,
    // Initiative status values (for fallback)
    'Not Started': 0,
    'On Hold': 0,
    'On Track': 50,
    'At Risk': 25,
    'Delayed': 10,
    'Live': 100,
    'Cancelled': 100
  };
  const getPercentForStatus = (status) => {
    // Normalize to lowercase for task statuses
    const normalized = status?.toLowerCase();
    return statusToPercent[normalized] ?? statusToPercent[status] ?? 0;
  };
  const completionPercent = (() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      const total = tasks.reduce((sum, t) => sum + getPercentForStatus(t.status || 'not started'), 0);
      return Math.round(total / tasks.length);
    }
    return getPercentForStatus(i.status || 'Not Started');
  })();
  
  // Calculate aging metrics
  const createDate = i.createdAt ? new Date(i.createdAt) : null;
  const startDate = i.startDate ? new Date(i.startDate) : null;
  const endDate = i.endDate ? new Date(i.endDate) : null;
  
  // Age Created to Start: Calculate from Create Date to Start Date
  let ageCreatedToStart = null;
  if (createDate && startDate) {
    // Normalize dates to midnight to compare only the date part (ignore time)
    const createDateNormalized = new Date(createDate.getFullYear(), createDate.getMonth(), createDate.getDate());
    const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    ageCreatedToStart = Math.floor((startDateNormalized - createDateNormalized) / (1000 * 60 * 60 * 24));
  }
  
  // Cycle Time (Age Start to End): Calculate from Start Date to End Date (or Current Date if End Date is empty)
  let cycleTime = null;
  if (startDate) {
    if (endDate) {
      // If End Date exists, calculate from Start Date to End Date
      cycleTime = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    } else {
      // If End Date is empty, calculate from Start Date to Current Date
      const now = new Date();
      cycleTime = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    }
  }
  
  // Total Age: Age Created to Start + Cycle Time
  let totalAge = null;
  if (ageCreatedToStart !== null && cycleTime !== null) {
    totalAge = ageCreatedToStart + cycleTime;
  } else if (ageCreatedToStart !== null) {
    // If cycle time not available (no start date), just show age created to start
    totalAge = ageCreatedToStart;
  } else if (cycleTime !== null) {
    // If only cycle time is available (no create date), show cycle time
    totalAge = cycleTime;
  }
  
  // Keep daysSinceCreated for backward compatibility (used in dashboard)
  const now = new Date();
  const daysSinceCreated = createDate ? Math.floor((now - createDate) / (1000 * 60 * 60 * 24)) : 0;
  
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
      startDate: 'Actual Start Date',
      endDate: 'Actual End Date',
      planStartDate: 'Plan Start Date',
      planEndDate: 'Plan End Date',
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
        <div><div class="muted">Actual Start Date</div><div>${i.startDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Actual End Date</div><div>${i.endDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Plan Start Date</div><div>${i.planStartDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Plan End Date</div><div>${i.planEndDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Age Created to Start</div><div><strong>${ageCreatedToStart !== null ? ageCreatedToStart + ' days' : 'N/A'}</strong></div></div>
        <div><div class="muted">Cycle Time (Age Start to End)</div><div><strong>${cycleTime !== null ? cycleTime + ' days' : 'N/A'}</strong></div></div>
        <div><div class="muted">Total Age</div><div><strong>${totalAge !== null ? totalAge + ' days' : 'N/A'}</strong></div></div>
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
      
      <div style="margin-top:12px"><a href="#list"><button>Back</button></a></div>
    </div>
    
    
    <!-- Comments & Activity Log Combined Section -->
    <div class="card" style="margin-top: 24px;">
      <!-- Tabs Header -->
      <div style="display: flex; border-bottom: 2px solid var(--border); margin-bottom: 16px;">
        <button id="tab-comments" class="tab-btn active" style="padding: 12px 24px; border: none; background: none; font-size: 14px; font-weight: 600; cursor: pointer; border-bottom: 2px solid var(--brand); margin-bottom: -2px; color: var(--brand);">
          💬 Comments <span style="background: var(--gray-200); padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 6px;">${comments.length}</span>
        </button>
        <button id="tab-activity" class="tab-btn" style="padding: 12px 24px; border: none; background: none; font-size: 14px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; color: var(--muted);">
          📋 Activity Log <span style="background: var(--gray-200); padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 6px;">${i.changeHistory?.length || 0}</span>
        </button>
      </div>
      
      <!-- Comments Tab Content -->
      <div id="tab-content-comments" class="tab-content">
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
      
      <!-- Activity Log Tab Content -->
      <div id="tab-content-activity" class="tab-content" style="display: none; max-height: 600px; overflow-y: auto;">
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
              const taskStatus = (t.status || 'not started').toLowerCase();
              const taskStatusLabels = { 'not started': 'Not Started', 'in progress': 'In Progress', 'at risk': 'At Risk', 'cancel': 'Cancelled', 'done': 'Done' };
              const taskStatusLabel = taskStatusLabels[taskStatus] || t.status || 'Not Started';
              return `
                <tr>
                  <td><strong>${t.name}</strong>${t.description ? `<br><small class="muted">${t.description}</small>` : ''}</td>
                  <td>${t.milestone || '-'}</td>
                  <td>${assignee}</td>
                  <td><span class="status-badge status-${taskStatus.replace(/\s+/g, '-')}">${taskStatusLabel}</span></td>
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
        <div class="kanban-board" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; overflow-x: auto;">
          ${(() => {
            // Task status enums with display labels - ordered: Not Started -> In Progress -> Done -> At Risk -> Cancelled
            const KANBAN_STATUSES = [
              { value: 'not started', label: 'Not Started' },
              { value: 'in progress', label: 'In Progress' },
              { value: 'done', label: 'Done' },
              { value: 'at risk', label: 'At Risk' },
              { value: 'cancel', label: 'Cancelled' }
            ];
            return KANBAN_STATUSES.map(({ value: status, label }) => {
              // Match tasks by normalizing status to lowercase
              const statusTasks = tasks.filter(t => (t.status || 'not started').toLowerCase() === status);
              return `
                <div class="kanban-column" data-status="${status}" style="background: var(--gray-50); border-radius: 8px; padding: 12px; min-height: 200px;">
                  <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">${label} (${statusTasks.length})</h4>
                  <div class="kanban-tasks" data-status="${status}">
                    ${statusTasks.map(t => {
                      const assignee = nameById(LOOKUPS.users, t.assigneeId) || 'Unassigned';
                      return `
                        <div class="kanban-task" draggable="true" data-id="${t.id}" data-status="${(t.status || 'not started').toLowerCase()}" style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 6px; cursor: move; box-shadow: var(--shadow);">
                          <div style="font-weight: 600; margin-bottom: 4px;">${t.name}</div>
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
            }).join('');
          })()}
        </div>
      </div>
      
      <!-- Task Gantt Chart View -->
      <div id="tasks-gantt-view" class="task-view hidden">
        <div id="gantt-container" style="overflow-x: auto; overflow-y: auto; max-height: 70vh; border: 1px solid var(--border); border-radius: 8px; background: white;">
          <div id="gantt-chart" style="min-width: 100%;">
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
        
        // Compress file if larger than 300KB
        let fileToUpload = file;
        if (file.size > 300 * 1024) {
          fileToUpload = await compressFile(file, 300);
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
  
  // Tab switching for Comments/Activity Log
  const tabComments = document.getElementById('tab-comments');
  const tabActivity = document.getElementById('tab-activity');
  const contentComments = document.getElementById('tab-content-comments');
  const contentActivity = document.getElementById('tab-content-activity');
  
  const switchTab = (activeTab) => {
    // Update tab buttons
    [tabComments, tabActivity].forEach(tab => {
      tab.style.borderBottomColor = 'transparent';
      tab.style.color = 'var(--muted)';
      tab.style.fontWeight = '500';
    });
    activeTab.style.borderBottomColor = 'var(--brand)';
    activeTab.style.color = 'var(--brand)';
    activeTab.style.fontWeight = '600';
    
    // Show/hide content
    if (activeTab === tabComments) {
      contentComments.style.display = 'block';
      contentActivity.style.display = 'none';
    } else {
      contentComments.style.display = 'none';
      contentActivity.style.display = 'block';
    }
  };
  
  tabComments.onclick = () => switchTab(tabComments);
  tabActivity.onclick = () => switchTab(tabActivity);
  
  // Edit mode toggle button - replace view with edit form
  document.getElementById('toggle-edit-btn').onclick = () => {
    const itPicIds = i.itPicIds || (i.itPicId ? [i.itPicId] : []);
    
    // Filter users for specific fields
    const businessOwnerUsers = filterUsersByRole(LOOKUPS.users, 'businessOwner');
    const itPicUsers = filterUsersByRole(LOOKUPS.users, 'itPic');
    const itManagerUsers = filterUsersByRole(LOOKUPS.users, 'itManager');
    const itPmUsers = filterUsersByRole(LOOKUPS.users, 'itPm');
    
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
        ${formRow('Department', createSearchableSelect('departmentId', LOOKUPS.departments, i.departmentId || '', 'Select...'))}
        ${formRow('Actual Start Date', `<input type="date" name="startDate" value="${i.startDate?.slice(0,10) || ''}" />`)}
        ${formRow('Actual End Date', `<input type="date" name="endDate" value="${i.endDate?.slice(0,10) || ''}" />`)}
        ${formRow('Plan Start Date', `<input type="date" name="planStartDate" value="${i.planStartDate?.slice(0,10) || ''}" required />`)}
        ${formRow('Plan End Date', `<input type="date" name="planEndDate" value="${i.planEndDate?.slice(0,10) || ''}" />`)}
        <div class="form-row"><label>Age Created to Start</label><div><strong>${ageCreatedToStart !== null ? ageCreatedToStart + ' days' : 'N/A'}</strong></div></div>
        <div class="form-row"><label>Cycle Time (Age Start to End)</label><div><strong>${cycleTime !== null ? cycleTime + ' days' : 'N/A'}</strong></div></div>
        <div class="form-row"><label>Total Age</label><div><strong>${totalAge !== null ? totalAge + ' days' : 'N/A'}</strong></div></div>
        ${formRow('Description', `<textarea name="description" class="long-text" required style="min-height: 100px;">${(i.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`)}
        ${formRow('Business Impact', `<textarea name="businessImpact" class="long-text" required style="min-height: 100px;">${(i.businessImpact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`)}
        ${formRow('Remark', `<textarea name="remark" class="long-text" style="min-height: 80px;">${(i.remark || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`)}
        ${formRow('Project Doc Link', `<input name="documentationLink" type="url" value="${i.documentationLink || ''}" />`)}
        
        <!-- Project Team Section -->
        <div style="margin-top: 24px; padding: 20px; background: var(--gray-50); border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: var(--text);">👥 Project Team</h3>
          ${formRow('IT PM', createSearchableSelect('itPmId', itPmUsers, i.itPmId || '', 'Select...', true))}
          ${formRow('IT PIC', createMultiSelect('itPicIds', itPicUsers, itPicIds))}
          ${formRow('IT Manager', createMultiSelect('itManagerIds', itManagerUsers, i.itManagerIds || []))}
          ${formRow('Business Owner / Requestor', createSearchableSelect('businessOwnerId', businessOwnerUsers, i.businessOwnerId || '', 'Select...'))}
          ${formRow('Business Users', createMultiSelect('businessUserIds', LOOKUPS.users, i.businessUserIds || []))}
        </div>
        
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
      planStartDate: obj.planStartDate || null,
      planEndDate: obj.planEndDate || null,
      remark: obj.remark || null,
        documentationLink: obj.documentationLink || null,
        changedBy: currentUser?.id || 'Unknown'
      };
      
      // CR dates removed - no longer used
      if (i.type === 'CR') {
        payload.cr = {};
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
            // Map enum value to display label
            const statusLabels = {
              'not started': 'Not Started',
              'in progress': 'In Progress',
              'at risk': 'At Risk',
              'cancel': 'Cancelled',
              'done': 'Done'
            };
            const label = statusLabels[status] || status;
            header.textContent = `${label} (${count})`;
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
  const exampleRow = ['Task Name', 'Task Description', '2025-01-01', '2025-01-15', '', 'not started', 'Development'];
  
  const csvContent = [
    headers.join(','),
    exampleRow.join(','),
    'Note: assigneeId should be a user ID from the system',
    'Status options: not started, in progress, at risk, cancel, done',
    'Milestone options: Business Requirement, Tech Assessment, Planning, Development, Testing, Live Preparation'
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
  
  // Status colors - supports both new enum values and legacy values
  const statusColors = {
    // New enum values (lowercase)
    'not started': '#94a3b8',
    'in progress': '#10b981',
    'at risk': '#ef4444',
    'cancel': '#6b7280',
    'done': '#3b82f6',
    // Legacy values for backward compatibility
    'Not Started': '#94a3b8',
    'On Hold': '#f59e0b',
    'On Track': '#10b981',
    'At Risk': '#ef4444',
    'Delayed': '#dc2626',
    'Live': '#3b82f6',
    'Cancelled': '#6b7280',
    'In Progress': '#10b981',
    'Done': '#3b82f6'
  };
  
  const getStatusColor = (status) => {
    if (!status) return '#94a3b8';
    // Try exact match first, then lowercase match
    return statusColors[status] || statusColors[status.toLowerCase()] || '#94a3b8';
  };
  
  // Render Gantt chart
  const rowHeight = 50;
  const headerHeight = 60;
  const sidebarWidth = 250;
  
  let html = `
    <div style="position: relative; min-width: ${totalDays * dayWidth + sidebarWidth}px;">
      <!-- Header with dates -->
      <div style="position: sticky; top: 0; z-index: 10; background: white; border-bottom: 2px solid var(--border);">
        <div style="display: flex; height: ${headerHeight}px;">
          <div style="width: ${sidebarWidth}px; padding: 8px; font-weight: 600; border-right: 1px solid var(--border); display: flex; align-items: center; position: sticky; left: 0; background: white; z-index: 11;">
            Task Name
          </div>
          <div style="flex: 1; position: relative; min-width: ${totalDays * dayWidth}px;">
            <div style="display: flex; width: ${totalDays * dayWidth}px;">
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
          const status = task.status || 'not started';
          const color = getStatusColor(status);
          const pos = calculateTaskPosition(task);
          
          return `
            <div style="position: relative; height: ${rowHeight}px; border-bottom: 1px solid var(--gray-200); display: flex;">
              <!-- Sidebar -->
              <div style="width: ${sidebarWidth}px; min-width: ${sidebarWidth}px; padding: 8px; border-right: 1px solid var(--border); background: var(--gray-50); display: flex; flex-direction: column; justify-content: center; position: sticky; left: 0; z-index: 5; overflow: hidden;">
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${sidebarWidth - 20}px;" title="${task.name}">${task.name}</div>
                <div style="font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  <span style="display: inline-block; width: 8px; height: 8px; background: ${color}; border-radius: 50%; margin-right: 4px;"></span>
                  ${status} • ${assignee}
                </div>
              </div>
              
              <!-- Timeline area -->
              <div style="flex: 1; position: relative; min-width: ${totalDays * dayWidth}px; width: ${totalDays * dayWidth}px;">
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
                              transition: transform 0.2s, box-shadow 0.2s;
                              overflow: hidden;"
                       title="${task.name} (${task.startDate ? task.startDate.slice(0,10) : 'No start'} → ${task.endDate ? task.endDate.slice(0,10) : 'No end'})">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${task.milestone ? `📍 ${task.milestone}` : task.name}</span>
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
              ${[
                { value: 'not started', label: 'Not Started' },
                { value: 'in progress', label: 'In Progress' },
                { value: 'at risk', label: 'At Risk' },
                { value: 'cancel', label: 'Cancelled' },
                { value: 'done', label: 'Done' }
              ].map(s => 
                `<option value="${s.value}" ${(task?.status || 'not started') === s.value ? 'selected' : ''}>${s.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <label>Milestone</label>
          <select name="milestone" style="width: 100%;">
            <option value="">None</option>
            ${[
              { value: 'Business Requirement', label: 'Business Requirement' },
              { value: 'Tech Assessment', label: 'Tech Assessment' },
              { value: 'Planning', label: 'Planning' },
              { value: 'Development', label: 'Development' },
              { value: 'Testing', label: 'Testing' },
              { value: 'Live Preparation', label: 'Live Preparation' }
            ].map(m => 
              `<option value="${m.value}" ${task?.milestone === m.value ? 'selected' : ''}>${m.label}</option>`
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
      status: formData.get('status') || 'not started',
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
    <div class="modal-content" style="max-width: 700px;">
      <h3>Upload Tasks (CSV)</h3>
      <p class="muted" style="margin-bottom: 12px;">
        Upload a CSV file with columns: <code>name, description, startDate, endDate, assigneeId, status, milestone</code>
      </p>
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
        <strong>Valid Status values:</strong> not started, in progress, at risk, cancel, done<br>
        <strong>Valid Milestone values:</strong> Business Requirement, Tech Assessment, Planning, Development, Testing, Live Preparation<br>
        <span class="muted" style="font-size: 12px;">Note: Values are case-insensitive. Invalid values will be normalized automatically.</span>
      </div>
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
  await ensureLookups();
  const i = await fetchJSON('/api/initiatives/' + id);
  
  // Set active nav based on initiative type
  setActive(i.type === 'CR' ? '#crlist' : '#list');
  
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
  
  // File upload handling for edit form
  const fileInput = document.getElementById('documents');
  const filePreview = document.getElementById('filePreview');
  const selectedFiles = [];
  const compressionInfo = [];
  
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      selectedFiles.length = 0;
      compressionInfo.length = 0;
      
      // Process and compress files
      filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Processing files...</strong></div>';
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalSize = file.size;
        const compressed = await compressFileIfNeeded(file);
        selectedFiles.push(compressed);
        
        // Track compression info - show even if compression happened but didn't reach target
        if (compressed.size < originalSize) {
          // Compression occurred, even if minimal
          const reductionPercent = ((originalSize - compressed.size) / originalSize * 100).toFixed(1);
          compressionInfo.push({ 
            original: originalSize, 
            compressed: compressed.size, 
            reduced: true,
            reductionPercent: reductionPercent
          });
          console.log(`[File Compression] ${file.name}: ${(originalSize/1024).toFixed(2)} KB → ${(compressed.size/1024).toFixed(2)} KB (${reductionPercent}% reduction)`);
        } else if (compressed.size === originalSize && originalSize > 300 * 1024) {
          // File couldn't be compressed (e.g., already optimized)
          compressionInfo.push({ 
            original: originalSize, 
            compressed: compressed.size, 
            reduced: false, 
            note: 'File already optimized - minimal compression possible' 
          });
          console.log(`[File Compression] ${file.name}: No compression possible (already optimized)`);
        } else {
          compressionInfo.push(null);
        }
      }
      
      // Display file preview
      if (selectedFiles.length > 0) {
        filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Selected files:</strong></div>' +
          selectedFiles.map((file, index) => {
            const compInfo = compressionInfo[index];
            let sizeDisplay = '';
            if (compInfo && compInfo.reduced) {
              const reduction = ((compInfo.original - compInfo.compressed) / compInfo.original * 100).toFixed(1);
              sizeDisplay = `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #28a745;">(compressed from ${(compInfo.original / 1024).toFixed(1)} KB, ${reduction}% reduction)</span></span>`;
            } else if (compInfo && !compInfo.reduced && compInfo.note) {
              sizeDisplay = `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #ff9800;">(${compInfo.note})</span></span>`;
            } else {
              sizeDisplay = `<span style="color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>`;
            }
            
            // Warn if file is still too large
            const warning = file.size > 300 * 1024 
              ? `<span style="color: #ff6b6b; font-size: 0.9em; margin-left: 8px;">⚠️ File exceeds 300KB${compInfo && compInfo.note ? ' - ' + compInfo.note.toLowerCase() : ' - may need manual compression'}</span>`
              : '';
            
            return `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-radius: 4px;">
                <span>📄 ${file.name}</span>
                ${sizeDisplay}
                ${warning}
                <button type="button" onclick="removeFileEdit(${index})" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
              </div>
            `;
          }).join('');
      } else {
        filePreview.innerHTML = '';
      }
    };
    
    // Global function to remove files in edit form
    window.removeFileEdit = (index) => {
      selectedFiles.splice(index, 1);
      compressionInfo.splice(index, 1);
      
      // Update file input
      const dt = new DataTransfer();
      selectedFiles.forEach(file => dt.items.add(file));
      fileInput.files = dt.files;
      
      // Rebuild preview display
      if (selectedFiles.length > 0) {
        filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Selected files:</strong></div>' +
          selectedFiles.map((file, newIndex) => {
            const compInfo = compressionInfo[newIndex];
            const sizeDisplay = compInfo 
              ? `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #28a745;">(compressed from ${(compInfo.original / 1024).toFixed(1)} KB)</span></span>`
              : `<span style="color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>`;
            
            const warning = file.size > 300 * 1024 
              ? `<span style="color: #ff6b6b; font-size: 0.9em; margin-left: 8px;">⚠️ File exceeds 300KB - may need manual compression</span>`
              : '';
            
            return `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-radius: 4px;">
                <span>📄 ${file.name}</span>
                ${sizeDisplay}
                ${warning}
                <button type="button" onclick="removeFileEdit(${newIndex})" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
              </div>
            `;
          }).join('');
      } else {
        filePreview.innerHTML = '';
      }
    };
  }
  
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
      planStartDate: obj.planStartDate || null,
      planEndDate: obj.planEndDate || null,
      remark: obj.remark || null,
      documentationLink: obj.documentationLink || null,
      changedBy: currentUser?.id || 'Unknown'
    };
    // CR dates removed - no longer used
    if (i.type === 'CR') {
      payload.cr = {};
    }
    try {
      await fetchJSON(`/api/initiatives/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      
      // Upload documents if any files were selected
      if (selectedFiles && selectedFiles.length > 0) {
        try {
          for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('initiativeId', id);
            
            await fetchJSON('/api/documents', {
              method: 'POST',
              body: formData,
              skipJson: true
            });
          }
        } catch (uploadError) {
          console.error('Error uploading documents:', uploadError);
          alert(`Initiative updated successfully, but some documents failed to upload: ${uploadError.message}`);
        }
      }
      
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
  // Use CR-specific search key to keep Project and CR searches separate
  const q = urlParams.get('cr_q') || '';
  // Parse multi-value filters (comma-separated)
  const parseFilter = (key) => {
    const val = urlParams.get(key);
    return val ? val.split(',').filter(v => v) : [];
  };

  // Parse date filters (format: operator:date, e.g., "gte:2024-01-01")
  const parseDateFilter = (key) => {
    const val = urlParams.get(key);
    if (!val) return null;
    const parts = val.split(':');
    if (parts.length === 2) {
      return { operator: parts[0], date: parts[1] };
    }
    return null;
  };

  const filter = {
    departmentId: parseFilter('cr_departmentId'),
    priority: parseFilter('cr_priority'),
    status: parseFilter('cr_status'),
    milestone: parseFilter('cr_milestone'),
    itPicId: parseFilter('cr_itPicId'),
    itPmId: parseFilter('cr_itPmId'),
    itManagerId: parseFilter('cr_itManagerId'),
    createdAt: parseDateFilter('cr_createdAt'),
    startDate: parseDateFilter('cr_startDate'),
    endDate: parseDateFilter('cr_endDate')
  };
  const sortParam = urlParams.get('cr_sort') || '';
  
  // Build API query string with multi-value filters
  const apiQs = new URLSearchParams();
  apiQs.set('type', 'CR');
  if (q) apiQs.set('q', q);
  if (filter.departmentId.length) apiQs.set('departmentId', filter.departmentId.join(','));
  if (filter.priority.length) apiQs.set('priority', filter.priority.join(','));
  if (filter.status.length) apiQs.set('status', filter.status.join(','));
  if (filter.milestone.length) apiQs.set('milestone', filter.milestone.join(','));
  if (filter.itPicId.length) apiQs.set('itPicId', filter.itPicId.join(','));
  if (filter.itPmId.length) apiQs.set('itPmId', filter.itPmId.join(','));
  
  let data;
  try {
    data = await fetchJSON('/api/initiatives?' + apiQs.toString());
  } catch (e) {
    console.error('Failed to fetch CR initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load CR initiatives: ${e.message}</div>`;
    return;
  }

  // Apply client-side filtering for date filters (CR list)
  if (filter.createdAt) {
    const filterDate = new Date(filter.createdAt.date);
    data = data.filter(i => {
      if (!i.createdAt) return false;
      const itemDate = new Date(i.createdAt);
      if (filter.createdAt.operator === 'eq') return itemDate.toDateString() === filterDate.toDateString();
      if (filter.createdAt.operator === 'gte') return itemDate >= filterDate;
      if (filter.createdAt.operator === 'lte') return itemDate <= filterDate;
      return true;
    });
  }
  if (filter.startDate) {
    const filterDate = new Date(filter.startDate.date);
    data = data.filter(i => {
      if (!i.startDate) return false;
      const itemDate = new Date(i.startDate);
      if (filter.startDate.operator === 'eq') return itemDate.toDateString() === filterDate.toDateString();
      if (filter.startDate.operator === 'gte') return itemDate >= filterDate;
      if (filter.startDate.operator === 'lte') return itemDate <= filterDate;
      return true;
    });
  }
  if (filter.endDate) {
    const filterDate = new Date(filter.endDate.date);
    data = data.filter(i => {
      if (!i.endDate) return false;
      const itemDate = new Date(i.endDate);
      if (filter.endDate.operator === 'eq') return itemDate.toDateString() === filterDate.toDateString();
      if (filter.endDate.operator === 'gte') return itemDate >= filterDate;
      if (filter.endDate.operator === 'lte') return itemDate <= filterDate;
      return true;
    });
  }

  // Apply client-side filtering for IT Manager (initiative has itManagerIds)
  if (filter.itManagerId.length > 0) {
    data = data.filter(i => {
      const raw = i.itManagerIds || i.itManagerId || [];
      const ids = Array.isArray(raw)
        ? raw
        : String(raw).split(',').map(v => v.trim()).filter(Boolean);
      return filter.itManagerId.some(sel => ids.includes(sel));
    });
  }

  // Build user subsets for filters (role/type based) - same rules as Project List
  const norm = (s) => String(s || '').trim().toLowerCase();
  const roleNorm = (u) => norm(u?.role).replace(/\s+/g, '');
  const typeNorm = (u) => norm(u?.type).replace(/\s+/g, '');
  const isITRole = (u) => roleNorm(u) === 'it';
  const isManagerType = (u) => typeNorm(u) === 'manager';

  const itManagerFilterUsers = (LOOKUPS.users || []).filter(u => isITRole(u) && isManagerType(u));
  const itPicFilterUsers = (LOOKUPS.users || []).filter(u => isITRole(u));
  const itPmFilterUsers = (LOOKUPS.users || []).filter(u => {
    const r = roleNorm(u);
    const rRaw = norm(u?.role);
    if (r === 'admin') return true;
    if (r === 'itpm') return true;
    if (rRaw === 'it - pm' || rRaw === 'it pm' || rRaw === 'it-pm') return true;
    if (isITRole(u) && isManagerType(u)) return true;
    return false;
  });
  
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
    { key: 'planStartDate', class: 'col-plan-start-date', label: 'Plan Start Date', sortable: true },
    { key: 'planEndDate', class: 'col-plan-end-date', label: 'Plan End Date', sortable: true },
    { key: 'ageCreatedToStart', class: 'col-age-created-to-start', label: 'Age Created to Start', sortable: false },
    { key: 'cycleTime', class: 'col-cycle-time', label: 'Cycle Time (Age Start to End)', sortable: false },
    { key: 'businessImpact', class: 'col-impact', label: 'Business Impact', sortable: true },
    { key: 'remark', class: 'col-remark', label: 'Remark', sortable: true },
    { key: 'documentationLink', class: 'col-doc', label: 'CR Doc Link', sortable: true },
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
        </div>
        <div class="filter-group" id="basic-filters">
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
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fItPic">
              IT PIC ${filter.itPicId.length > 0 ? `(${filter.itPicId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fItPic">
              ${itPicFilterUsers.map(u => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${u.id}" ${filter.itPicId.includes(u.id) ? 'checked' : ''}>
                  ${u.name}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fItPm">
              IT PM ${filter.itPmId.length > 0 ? `(${filter.itPmId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fItPm">
              ${itPmFilterUsers.map(u => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${u.id}" ${filter.itPmId.includes(u.id) ? 'checked' : ''}>
                  ${u.name}
                </label>
              `).join('')}
            </div>
          </div>
          <div class="multi-select-wrapper">
            <button class="multi-select-btn" data-filter="fItManager">
              IT Manager ${filter.itManagerId.length > 0 ? `(${filter.itManagerId.length})` : ''}
            </button>
            <div class="multi-select-dropdown" id="dropdown-fItManager">
              ${itManagerFilterUsers.map(u => `
                <label class="multi-select-option">
                  <input type="checkbox" value="${u.id}" ${filter.itManagerId.includes(u.id) ? 'checked' : ''}>
                  ${u.name}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="date-filters-group" id="date-filters">
          <div class="date-filter-wrapper">
            <button class="multi-select-btn" data-filter="fCreateDate">
              <span class="filter-label">Create Date</span> ${filter.createdAt ? '<span class="filter-active">✓</span>' : ''}
            </button>
            <div class="date-filter-dropdown" id="dropdown-fCreateDate">
              <div class="date-filter-content">
                <select id="createDate-operator" class="date-operator-select">
                  <option value="eq" ${filter.createdAt?.operator === 'eq' ? 'selected' : ''}>Equal</option>
                  <option value="gte" ${filter.createdAt?.operator === 'gte' ? 'selected' : ''}>≥ Greater or Equal</option>
                  <option value="lte" ${filter.createdAt?.operator === 'lte' ? 'selected' : ''}>≤ Less or Equal</option>
                </select>
                <input type="date" id="createDate-value" value="${filter.createdAt?.date || ''}" class="date-input">
              </div>
            </div>
          </div>
          <div class="date-filter-wrapper">
            <button class="multi-select-btn" data-filter="fStartDate">
              <span class="filter-label">Actual Start Date</span> ${filter.startDate ? '<span class="filter-active">✓</span>' : ''}
            </button>
            <div class="date-filter-dropdown" id="dropdown-fStartDate">
              <div class="date-filter-content">
                <select id="startDate-operator" class="date-operator-select">
                  <option value="eq" ${filter.startDate?.operator === 'eq' ? 'selected' : ''}>Equal</option>
                  <option value="gte" ${filter.startDate?.operator === 'gte' ? 'selected' : ''}>≥ Greater or Equal</option>
                  <option value="lte" ${filter.startDate?.operator === 'lte' ? 'selected' : ''}>≤ Less or Equal</option>
                </select>
                <input type="date" id="startDate-value" value="${filter.startDate?.date || ''}" class="date-input">
              </div>
            </div>
          </div>
          <div class="date-filter-wrapper">
            <button class="multi-select-btn" data-filter="fEndDate">
              <span class="filter-label">Actual End Date</span> ${filter.endDate ? '<span class="filter-active">✓</span>' : ''}
            </button>
            <div class="date-filter-dropdown" id="dropdown-fEndDate">
              <div class="date-filter-content">
                <select id="endDate-operator" class="date-operator-select">
                  <option value="eq" ${filter.endDate?.operator === 'eq' ? 'selected' : ''}>Equal</option>
                  <option value="gte" ${filter.endDate?.operator === 'gte' ? 'selected' : ''}>≥ Greater or Equal</option>
                  <option value="lte" ${filter.endDate?.operator === 'lte' ? 'selected' : ''}>≤ Less or Equal</option>
                </select>
                <input type="date" id="endDate-value" value="${filter.endDate?.date || ''}" class="date-input">
              </div>
            </div>
          </div>
        </div>
        <div class="action-group">
          <button id="btn-columns" onclick="showColumnSettings('crlist')" title="Column Settings" class="icon-btn">⚙️</button>
          <button id="apply-filters-btn" class="primary" onclick="applyFiltersCR()">Apply Filters</button>
          <a href="#new/CR"><button class="primary">+ New CR</button></a>
        </div>
      </div>
    </div>
    <div class="table-wrapper">
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
    </div>
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
  // Multi-select dropdown handlers (checkbox filters)
  document.querySelectorAll('.multi-select-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const filterId = btn.dataset.filter;
      const dropdown = document.getElementById(`dropdown-${filterId}`);
      if (!dropdown) return;
      const isOpen = dropdown.classList.contains('open');
      // Close all dropdowns
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
      if (!isOpen) {
        dropdown.classList.add('open');
        document.body.classList.add('dropdown-open');
      }
    };
  });

  // Date filter dropdown handlers
  document.querySelectorAll('.date-filter-wrapper .multi-select-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const filterId = btn.dataset.filter;
      const dropdown = document.getElementById(`dropdown-${filterId}`);
      if (!dropdown) return;
      const isOpen = dropdown.classList.contains('open');
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
      if (!isOpen) {
        dropdown.classList.add('open');
        document.body.classList.add('dropdown-open');
      }
    };
  });

  // Close dropdowns when clicking outside or on overlay
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select-wrapper') && !e.target.closest('.date-filter-wrapper') && !e.target.closest('.multi-select-dropdown') && !e.target.closest('.date-filter-dropdown')) {
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
    }
  });
  // Close dropdowns on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.multi-select-dropdown, .date-filter-dropdown').forEach(d => d.classList.remove('open'));
      document.body.classList.remove('dropdown-open');
    }
  });
  
  window.applyFiltersCR = function() {
    const searchVal = document.getElementById('search').value;
    const url = new URL(location.href);
    
    // Update search with CR-specific key
    if (searchVal) url.searchParams.set('cr_q', searchVal);
    else url.searchParams.delete('cr_q');
    
    // Get selected values from each multi-select
    const getSelectedValues = (filterId) => {
      const checkboxes = document.querySelectorAll(`#dropdown-${filterId} input[type="checkbox"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    };
    
    // Use CR-specific filter keys
    const filterMap = {
      'fDepartment': 'cr_departmentId',
      'fPriority': 'cr_priority',
      'fStatus': 'cr_status',
      'fMilestone': 'cr_milestone',
      'fItPic': 'cr_itPicId',
      'fItPm': 'cr_itPmId',
      'fItManager': 'cr_itManagerId'
    };
    
    Object.entries(filterMap).forEach(([filterId, paramKey]) => {
      const values = getSelectedValues(filterId);
      if (values.length > 0) {
        url.searchParams.set(paramKey, values.join(','));
      } else {
        url.searchParams.delete(paramKey);
      }
    });
    
    // Handle date filters (CR)
    const createDateOp = document.getElementById('createDate-operator')?.value;
    const createDateVal = document.getElementById('createDate-value')?.value;
    if (createDateOp && createDateVal) url.searchParams.set('cr_createdAt', `${createDateOp}:${createDateVal}`);
    else url.searchParams.delete('cr_createdAt');

    const startDateOp = document.getElementById('startDate-operator')?.value;
    const startDateVal = document.getElementById('startDate-value')?.value;
    if (startDateOp && startDateVal) url.searchParams.set('cr_startDate', `${startDateOp}:${startDateVal}`);
    else url.searchParams.delete('cr_startDate');

    const endDateOp = document.getElementById('endDate-operator')?.value;
    const endDateVal = document.getElementById('endDate-value')?.value;
    if (endDateOp && endDateVal) url.searchParams.set('cr_endDate', `${endDateOp}:${endDateVal}`);
    else url.searchParams.delete('cr_endDate');

    history.pushState({}, '', url);
    renderCRList();
  };

  // Search auto-apply while typing (debounced) for CR list
  let crSearchDebounceTimer = null;
  const crSearchEl = document.getElementById('search');
  if (crSearchEl) {
    crSearchEl.addEventListener('input', () => {
      if (crSearchDebounceTimer) clearTimeout(crSearchDebounceTimer);
      crSearchDebounceTimer = setTimeout(() => {
        window.applyFiltersCR();
      }, 350);
    });
    crSearchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (crSearchDebounceTimer) clearTimeout(crSearchDebounceTimer);
        window.applyFiltersCR();
      }
    });
  }
  // Add resize handles to ALL columns (not just sortable) - CR List
  document.querySelectorAll('thead th').forEach(th => {
    // Skip actions column
    if (th.classList.contains('col-actions')) return;
    const resizer = document.createElement('span');
    resizer.className = 'col-resize';
    resizer.title = 'Drag to resize column';
    th.appendChild(resizer);
    
    // Only add sorting behavior to sortable columns
    if (th.classList.contains('sortable')) {
      th.onclick = (e) => {
        if (e.target === resizer || e.target.closest('.col-resize')) return; // ignore when resizing
        const key = th.dataset.key;
        const url = new URL(location.href);
        const current = url.searchParams.get('cr_sort') || '';
        const [curKey, curDir] = current.split(':');
        
        // 3-state cycle: none → asc → desc → none (default)
        let nextSort = '';
        if (curKey !== key) {
          // Different column clicked, start with ascending
          nextSort = `${key}:asc`;
        } else if (curDir === 'asc') {
          // Same column, currently ascending → go to descending
          nextSort = `${key}:desc`;
        } else if (curDir === 'desc') {
          // Same column, currently descending → remove sort (default)
          nextSort = '';
        } else {
          // No current sort on this column → start ascending
          nextSort = `${key}:asc`;
        }
        
        if (nextSort) {
          url.searchParams.set('cr_sort', nextSort);
        } else {
          url.searchParams.delete('cr_sort');
        }
        history.pushState({}, '', url);
        renderCRList();
      };
    }
    
    // Resize behavior for ALL columns
    let startX = 0; let startWidth = 0;
    // Use pointer events + window listeners (more reliable than document.onpointermove)
    resizer.onpointerdown = (ev) => {
      ev.preventDefault();
      ev.stopPropagation(); // Prevent sorting when resizing
      resizer.setPointerCapture?.(ev.pointerId);
      startX = ev.clientX;
      startWidth = th.offsetWidth;
      const colClass = th.dataset.col;
      const table = th.closest('table');
      if (!table || !colClass) return;
      const viewType = 'crlist';

      // Debug: verify the handler is firing
      console.log('[column-resize] start', viewType, colClass, startWidth);

      const onMove = (mv) => {
        mv.preventDefault();
        const dx = mv.clientX - startX;
        const newW = Math.max(80, startWidth + dx);
        console.log('[column-resize] move', colClass, 'dx:', dx, 'newW:', newW);
        // Set width on header with min/max to force it
        th.style.width = newW + 'px';
        th.style.minWidth = newW + 'px';
        th.style.maxWidth = newW + 'px';
        // Set width on all matching cells
        const cells = table.querySelectorAll(`tbody td.${colClass}`);
        console.log('[column-resize] found', cells.length, 'cells for', colClass);
        cells.forEach(td => {
          td.style.width = newW + 'px';
          td.style.minWidth = newW + 'px';
          td.style.maxWidth = newW + 'px';
        });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        console.log('[column-resize] end', colClass, 'final width:', th.offsetWidth);
        // Persist width
        const widths = getColumnWidths(viewType) || {};
        const w = Math.max(80, th.offsetWidth || 0);
        widths[colClass] = w;
        saveColumnWidths(viewType, widths);
      };

      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
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

  // Apply persisted column widths for CR List table
  applyColumnWidths('crlist', '#cr-table');

  // Expand/collapse handler for Description/Remark cells (event delegation)
  const crTable = document.getElementById('cr-table');
  if (crTable) {
    crTable.addEventListener('click', (e) => {
      const btn = e.target.closest?.('button.cell-toggle');
      if (!btn) return;
      e.preventDefault();
      const td = btn.closest('td.cell-expandable');
      if (!td) return;
      const expanded = td.classList.toggle('expanded');
      btn.textContent = expanded ? 'Less' : 'More';
    });
  }
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
  } else if (filterType === 'open') {
    // For "open" CRs, we'll fetch all and filter out LIVE ones
    // Don't set any status filter, we'll filter client-side
  } else if (filterType === 'inProgress') {
    // For "In Progress Projects", we'll fetch all projects and filter client-side
  }
  
  try {
    let initiatives = await fetchJSON('/api/initiatives?' + apiQs.toString());
    
    // Filter out LIVE CRs for "open" filter
    if (filterType === 'open' && initiativeType === 'CR') {
      initiatives = initiatives.filter(i => {
        const status = (i.status || '').toUpperCase();
        return status !== 'LIVE';
      });
    }

    // Filter to only in-progress project statuses for "inProgress" filter
    if (filterType === 'inProgress' && initiativeType === 'Project') {
      initiatives = initiatives.filter(i => {
        const status = (i.status || '').toUpperCase().trim();
        return status === 'ON TRACK' || status === 'AT RISK' || status === 'DELAYED';
      });
    }
    
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
            const statusClass = (i.status || '').toLowerCase().replace(/\s+/g, '-');
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

  // --- Project aging metrics (Avg Total Age / Avg Age Created→Start / Avg Cycle Time) ---
  // We compute from initiatives dates so the metrics match the Initiative page definitions.
  let projectAgingMetrics = {
    avgTotalAge: 0,
    avgAgeCreatedToStart: 0,
    avgCycleTime: 0,
    counts: { totalAge: 0, createdToStart: 0, cycleTime: 0 },
    byId: {} // { [initiativeId]: { ageCreatedToStart, cycleTime, totalAge } }
  };

  const msPerDay = 1000 * 60 * 60 * 24;
  const floorDays = (ms) => Math.floor(ms / msPerDay);
  const safeDate = (v) => (v ? new Date(v) : null);
  const today = new Date();

  try {
    // Fetch projects with dates so we can compute all age metrics.
    // Use the same filters the dashboard uses (departmentId / itPmId / teamMemberId).
    const projQs = new URLSearchParams();
    projQs.set('type', 'Project');
    if (selectedDepartmentId) projQs.set('departmentId', selectedDepartmentId);
    if (selectedItPmId) projQs.set('itPmId', selectedItPmId);
    if (selectedTeamMemberId) projQs.set('teamMemberId', selectedTeamMemberId);

    const projects = await fetchJSON('/api/initiatives?' + projQs.toString());

    let sumTotalAge = 0;
    let sumCreatedToStart = 0;
    let sumCycleTime = 0;
    let countTotalAge = 0;
    let countCreatedToStart = 0;
    let countCycleTime = 0;

    (projects || []).forEach(p => {
      const createDate = safeDate(p.createdAt);
      const startDate = safeDate(p.startDate);
      const endDate = safeDate(p.endDate);

      let ageCreatedToStart = null;
      if (createDate && startDate) {
        // Calculate working days from create date to start date
        ageCreatedToStart = calculateWorkingDays(createDate, startDate);
      }

      let cycleTime = null;
      if (startDate) {
        const endOrNow = endDate || today;
        if (endOrNow) {
          // For end date, we want to include the end date itself, so add 1 day
          const endDateInclusive = new Date(endOrNow);
          endDateInclusive.setDate(endDateInclusive.getDate() + 1);
          cycleTime = calculateWorkingDays(startDate, endDateInclusive);
        }
      }

      // Total Age = Age Created→Start + Cycle Time.
      // If Create Date is missing, treat Age Created→Start as 0 (so Total Age = Cycle Time).
      let totalAge = null;
      if (cycleTime !== null) {
        totalAge = (ageCreatedToStart !== null ? ageCreatedToStart : 0) + cycleTime;
      }

      projectAgingMetrics.byId[p.id] = { ageCreatedToStart, cycleTime, totalAge };

      if (totalAge !== null) {
        sumTotalAge += totalAge;
        countTotalAge++;
      }
      if (ageCreatedToStart !== null) {
        sumCreatedToStart += ageCreatedToStart;
        countCreatedToStart++;
      }
      if (cycleTime !== null) {
        sumCycleTime += cycleTime;
        countCycleTime++;
      }
    });

    projectAgingMetrics = {
      avgTotalAge: countTotalAge ? Math.round(sumTotalAge / countTotalAge) : 0,
      avgAgeCreatedToStart: countCreatedToStart ? Math.round(sumCreatedToStart / countCreatedToStart) : 0,
      avgCycleTime: countCycleTime ? Math.round(sumCycleTime / countCycleTime) : 0,
      counts: { totalAge: countTotalAge, createdToStart: countCreatedToStart, cycleTime: countCycleTime },
      byId: projectAgingMetrics.byId
    };
  } catch (e) {
    console.warn('Failed to compute project aging metrics from initiatives:', e);
  }
  
  // Create simple bar charts
  const createBarChart = (data, labelKey, valueKey, title, clickable = false) => {
    const max = Math.max(...data.map(item => item[valueKey]), 1);
    return `
      <div class="card">
        <h3>${title}</h3>
        <div style="margin-top: 16px;">
          ${data.map(item => {
            const percentage = (item[valueKey] / max) * 100;
            const statusClass = item[labelKey]?.toLowerCase().replace(/\s+/g, '-') || '';
            const filterValue = item[labelKey] || '';
            const clickableStyle = clickable ? 'cursor: pointer;' : '';
            const clickableClass = clickable ? 'clickable-chart-item' : '';
            const dataAttrs = clickable ? `data-filter-type="${labelKey}" data-filter-value="${filterValue.replace(/"/g, '&quot;')}" data-title="${title}: ${filterValue.replace(/"/g, '&quot;')}"` : '';
            return `
              <div class="${clickableClass}" ${dataAttrs} style="display: flex; align-items: center; margin-bottom: 12px; ${clickableStyle}">
                <div style="width: 120px; font-size: 12px; color: var(--muted);">${item[labelKey]}</div>
                <div style="flex: 1; margin: 0 12px;">
                  <div style="background: #f1f5f9; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: ${statusClass.includes('live') ? '#3b82f6' : statusClass.includes('at-risk') ? '#f59e0b' : statusClass.includes('delayed') ? '#ef4444' : '#6366f1'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
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
      // Only include active users with roles: IT Manager, IT PM, IT - PM, or Admin
      if (u.active === false) return false;
      const role = (u.role || '').toLowerCase().trim();
      const isAdmin = u.isAdmin === true || u.isAdmin === 1 || role === 'admin' || role === 'administrator';
      // Check for IT Manager, IT PM, IT - PM, or Admin roles (case-insensitive)
      return role === 'it manager' || role === 'it pm' || role === 'it - pm' || role === 'itpm' || isAdmin;
    })
    .map(u => ({ value: u.id, label: u.name || u.email }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  // Team member options (only for Managers)
  const teamMemberOptions = isManager && teamMembers.length > 0
    ? teamMembers.map(m => ({ value: m.id, label: m.name || m.email }))
    : [];
  
  // KPI helpers
  const statusCount = (statusName) => {
    const target = (statusName || '').toUpperCase().trim();
    return (d.byStatus || [])
      .filter(s => String(s.status || '').toUpperCase().trim() === target)
      .reduce((sum, s) => sum + (s.c || 0), 0);
  };
  const notStartedProjects = statusCount('NOT STARTED');
  const liveProjects = d.liveCount || statusCount('LIVE') || 0;
  const cancelledProjects = statusCount('CANCELLED');
  const onHoldProjects = statusCount('ON HOLD');
  const onTrackProjects = statusCount('ON TRACK');
  const atRiskProjects = statusCount('AT RISK');
  const delayedProjects = statusCount('DELAYED');
  const inProgressProjects = onTrackProjects + atRiskProjects + delayedProjects;
  const totalProjectsExCancelled = (d.projects || 0) - cancelledProjects;

  // Normalize status labels for Status Distribution (combine different casings)
  const combinedStatusMap = {};
  (d.byStatus || []).forEach(item => {
    const rawStatus = String(item.status || '');
    const key = rawStatus.toUpperCase().trim();
    if (!key) return;
    if (!combinedStatusMap[key]) {
      // Preserve original casing for display, but normalize the key for grouping
      combinedStatusMap[key] = { ...item, status: rawStatus, c: item.c || 0 };
    } else {
      combinedStatusMap[key].c += item.c || 0;
    }
  });
  const combinedByStatus = Object.values(combinedStatusMap);

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
        <div style="font-size:32px;font-weight:700;color: var(--brand)">${totalProjectsExCancelled}</div>
      </div>
      <div class="card clickable-card" data-filter-type="status" data-filter-value="LIVE" data-title="Live Projects" style="cursor: pointer;">
        <div class="muted">Live Projects</div>
        <div style="font-size:32px;font-weight:700;color: #3b82f6">${d.liveCount || 0}</div>
      </div>
      <div class="card clickable-card" data-filter-type="inProgress" data-filter-value="" data-title="In Progress Projects" data-initiative-type="Project" style="cursor: pointer; border-left: 4px solid var(--success);">
        <div class="muted">In Progress Projects</div>
        <div style="font-size:32px;font-weight:700;color: var(--success)">${inProgressProjects}</div>
        <div class="muted" style="margin-top: 6px; font-size: 12px;">
          On Track + At Risk + Delayed
        </div>
      </div>
      <div class="card clickable-card" data-filter-type="status" data-filter-value="NOT STARTED" data-title="Not Started Projects" style="cursor: pointer;">
        <div class="muted">Not Started Projects</div>
        <div style="font-size:32px;font-weight:700;color: var(--muted)">${notStartedProjects}</div>
      </div>
      <div class="card" style="border-left: 4px solid var(--warning);">
        <div class="muted">Average Project Aging (Days)</div>
        <div style="display:flex; align-items:baseline; justify-content: space-between; gap: 12px; margin-top: 6px;">
          <div>
            <div style="font-size:12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px;">Avg Total Age</div>
            <div style="font-size:34px;font-weight:800;color: var(--warning); line-height: 1;">${projectAgingMetrics.avgTotalAge}</div>
          </div>
          <div style="font-size: 12px; color: var(--muted); text-align: right;">
            <div><strong>${projectAgingMetrics.avgAgeCreatedToStart}</strong> Avg Age Created→Start</div>
            <div><strong>${projectAgingMetrics.avgCycleTime}</strong> Avg Cycle Time (Start→End)</div>
          </div>
        </div>
        <div class="muted" style="margin-top: 10px; font-size: 12px;">
          Total Age = (Create→Start) + (Start→End/Now). For ongoing projects, End uses today.
        </div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      ${createBarChart(combinedByStatus, 'status', 'c', 'Status Distribution', true)}
      ${createBarChart(d.byPriority, 'priority', 'c', 'Priority Distribution', true)}
      <div class="card">
        <h3>Project Aging (Total Age)</h3>
        <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
          ${d.projectAging.map(project => {
            const m = projectAgingMetrics.byId[project.id] || {};
            const total = (m.totalAge ?? project.daysSinceCreated ?? 0);
            const aCS = m.ageCreatedToStart;
            const cT = m.cycleTime;
            const breakdown = (aCS !== null && aCS !== undefined && cT !== null && cT !== undefined)
              ? `Create→Start: ${aCS}d • Start→End/Now: ${cT}d`
              : 'Breakdown not available';
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 4px;">${project.name}</div>
                <div style="font-size: 12px; color: var(--muted);">
                  <span class="status-badge status-${project.status?.replace(/\s+/g, '-')}">${project.status}</span>
                  <span style="margin-left: 8px;">${project.milestone}</span>
                </div>
                <div class="muted" style="font-size: 11px; margin-top: 4px;">${breakdown}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 700; color: var(--warning);" title="${breakdown}">${total} days</span>
              </div>
            </div>
          `;
          }).join('')}
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
    
    // Get unique roles and types from users
    const roles = [...new Set(users.map(u => u.role).filter(Boolean))].sort();
    const types = [...new Set(users.map(u => u.type).filter(Boolean))].sort();
    
    // Function to render user rows
    const renderUserRows = (filteredUsers) => {
      return filteredUsers.map(user => `
        <tr data-name="${(user.name || '').toLowerCase()}" data-email="${(user.email || '').toLowerCase()}" data-role="${(user.role || '').toLowerCase()}" data-type="${(user.type || '').toLowerCase()}" data-department="${user.departmentId || ''}">
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
      `).join('');
    };
    
    app.innerHTML = `
      <div class="card">
        <h2>User Management</h2>
        
        <!-- Search and Create Button Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap;">
          <button class="primary" onclick="showCreateUserForm()">+ Create User</button>
          <div style="position: relative; flex: 1; max-width: 400px;">
            <input type="text" id="user-search" placeholder="Search by name or email..." style="width: 100%; padding: 10px 16px 10px 40px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; box-sizing: border-box;" />
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted);">🔍</span>
          </div>
          <div style="color: var(--muted); font-size: 14px;">
            Total: <strong id="user-count" style="color: var(--text);">${users.length}</strong> users
          </div>
        </div>
        
        <!-- Filter Row -->
        <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 14px; color: var(--muted); white-space: nowrap;">Role:</label>
            <select id="filter-role" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; min-width: 140px;">
              <option value="">All Roles</option>
              ${roles.map(r => `<option value="${r.toLowerCase()}">${r}</option>`).join('')}
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 14px; color: var(--muted); white-space: nowrap;">Type:</label>
            <select id="filter-type" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; min-width: 140px;">
              <option value="">All Types</option>
              ${types.map(t => `<option value="${t.toLowerCase()}">${t}</option>`).join('')}
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 14px; color: var(--muted); white-space: nowrap;">Department:</label>
            <select id="filter-department" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; min-width: 160px;">
              <option value="">All Departments</option>
              ${LOOKUPS.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
          <button id="clear-filters-btn" style="padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; background: var(--surface); cursor: pointer; display: none;">Clear Filters</button>
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
          <tbody id="users-tbody">
            ${renderUserRows(users)}
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
                <option value="IT - PM">IT - PM</option>
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
            <div class="form-row" style="flex-direction: row; align-items: center; gap: 8px;">
              <label style="margin: 0;">Active</label>
              <input type="checkbox" name="active" checked style="width: auto; margin: 0;" />
            </div>
            <div class="form-row" style="flex-direction: row; align-items: center; gap: 8px;">
              <label style="margin: 0;">Admin</label>
              <input type="checkbox" name="isAdmin" style="width: auto; margin: 0;" />
            </div>
            <div class="form-row" style="flex-direction: row; align-items: center; gap: 8px;">
              <label style="margin: 0;">Email Activated</label>
              <input type="checkbox" name="emailActivated" checked style="width: auto; margin: 0;" />
            </div>
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px;">
              <button type="button" onclick="closeUserForm()" style="padding: 8px 24px; font-size: 14px; line-height: 1; margin: 0;">Cancel</button>
              <button type="submit" style="padding: 8px 24px; font-size: 14px; line-height: 1; margin: 0; background: var(--color-primary-default); color: white; border-color: var(--color-primary-default);">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Search and Filter functionality
    const searchInput = document.getElementById('user-search');
    const filterRole = document.getElementById('filter-role');
    const filterType = document.getElementById('filter-type');
    const filterDepartment = document.getElementById('filter-department');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const usersTbody = document.getElementById('users-tbody');
    const userCount = document.getElementById('user-count');
    
    const applyFilters = () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const roleFilter = filterRole.value.toLowerCase();
      const typeFilter = filterType.value.toLowerCase();
      const deptFilter = filterDepartment.value;
      
      const rows = usersTbody.querySelectorAll('tr');
      let visibleCount = 0;
      
      rows.forEach(row => {
        const name = row.dataset.name || '';
        const email = row.dataset.email || '';
        const role = row.dataset.role || '';
        const type = row.dataset.type || '';
        const dept = row.dataset.department || '';
        
        // Check search match
        const searchMatch = !searchTerm || name.includes(searchTerm) || email.includes(searchTerm);
        
        // Check filter matches
        const roleMatch = !roleFilter || role === roleFilter;
        const typeMatch = !typeFilter || type === typeFilter;
        const deptMatch = !deptFilter || dept === deptFilter;
        
        const matches = searchMatch && roleMatch && typeMatch && deptMatch;
        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      
      userCount.textContent = visibleCount;
      
      // Show/hide clear filters button
      const hasFilters = searchTerm || roleFilter || typeFilter || deptFilter;
      clearFiltersBtn.style.display = hasFilters ? 'block' : 'none';
    };
    
    // Add event listeners
    searchInput.addEventListener('input', applyFilters);
    filterRole.addEventListener('change', applyFilters);
    filterType.addEventListener('change', applyFilters);
    filterDepartment.addEventListener('change', applyFilters);
    
    clearFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterRole.value = '';
      filterType.value = '';
      filterDepartment.value = '';
      applyFilters();
    });
    
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
    const predefinedRoleOrder = ['Admin', 'SeniorManagement', 'PMO', 'IT Manager', 'IT PM', 'IT - PM', 'ITPIC', 'BusinessOwner', 'User'];
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

  // --- CR aging metrics (Avg Total Age / Avg Age Created→Start / Avg Cycle Time) ---
  // Computed from CR initiatives dates so it matches Initiative page definitions.
  let crAgingMetrics = {
    avgTotalAge: 0,
    avgAgeCreatedToStart: 0,
    avgCycleTime: 0,
    counts: { totalAge: 0, createdToStart: 0, cycleTime: 0 },
    byId: {}
  };

  const msPerDay = 1000 * 60 * 60 * 24;
  const floorDays = (ms) => Math.floor(ms / msPerDay);
  const safeDate = (v) => (v ? new Date(v) : null);
  const today = new Date();

  try {
    // Fetch CR initiatives with dates so we can compute all age metrics.
    // Apply the same dashboard filters (departmentId and itManagerId).
    const crQs = new URLSearchParams();
    crQs.set('type', 'CR');
    if (selectedDepartmentId) crQs.set('departmentId', selectedDepartmentId);
    const crInitiatives = await fetchJSON('/api/initiatives?' + crQs.toString());

    // Role/type based IT Manager filter is stored on initiative.itManagerIds (array or CSV)
    let filteredCRs = crInitiatives || [];
    if (selectedItManagerId) {
      filteredCRs = filteredCRs.filter(i => {
        const raw = i.itManagerIds || i.itManagerId || [];
        const ids = Array.isArray(raw) ? raw : String(raw).split(',').map(v => v.trim()).filter(Boolean);
        return ids.includes(selectedItManagerId);
      });
    }

    let sumTotalAge = 0;
    let sumCreatedToStart = 0;
    let sumCycleTime = 0;
    let countTotalAge = 0;
    let countCreatedToStart = 0;
    let countCycleTime = 0;

    // Calculate aging metrics for breakdown table
    const calculateAgingMetrics = (cr, useForecast = false) => {
      const createDate = safeDate(cr.createdAt);
      const startDate = useForecast ? safeDate(cr.planStartDate) : safeDate(cr.startDate);
      const endDate = useForecast ? safeDate(cr.planEndDate) : safeDate(cr.endDate);
      
      let ageCreatedToStart = null;
      if (createDate && startDate) {
        // Calculate working days from create date to start date
        ageCreatedToStart = calculateWorkingDays(createDate, startDate);
      }
      
      let cycleTime = null;
      if (startDate) {
        const endOrNow = endDate || (useForecast ? null : today);
        if (endOrNow) {
          // For end date, we want to include the end date itself, so add 1 day
          const endDateInclusive = new Date(endOrNow);
          endDateInclusive.setDate(endDateInclusive.getDate() + 1);
          cycleTime = calculateWorkingDays(startDate, endDateInclusive);
        }
      }
      
      let totalAge = null;
      if (cycleTime !== null) {
        totalAge = (ageCreatedToStart !== null ? ageCreatedToStart : 0) + cycleTime;
      }
      
      return { ageCreatedToStart, cycleTime, totalAge };
    };

    // Separate Open and Live CRs
    const openCRs = filteredCRs.filter(cr => {
      const status = (cr.status || '').toUpperCase();
      return status !== 'LIVE';
    });
    
    const liveCRs = filteredCRs.filter(cr => {
      const status = (cr.status || '').toUpperCase();
      return status === 'LIVE';
    });

    // Calculate metrics for breakdown table
    const calculateBreakdown = (crs, useForecast = false) => {
      const breakdown = {
        P0: { qty: 0, sumCreatedToStart: 0, sumCycleTime: 0, countCreatedToStart: 0, countCycleTime: 0 },
        P1: { qty: 0, sumCreatedToStart: 0, sumCycleTime: 0, countCreatedToStart: 0, countCycleTime: 0 },
        P2: { qty: 0, sumCreatedToStart: 0, sumCycleTime: 0, countCreatedToStart: 0, countCycleTime: 0 }
      };
      
      crs.forEach(cr => {
        const priority = cr.priority || 'P2';
        if (!breakdown[priority]) return;
        
        breakdown[priority].qty++;
        const metrics = calculateAgingMetrics(cr, useForecast);
        
        if (metrics.ageCreatedToStart !== null) {
          breakdown[priority].sumCreatedToStart += metrics.ageCreatedToStart;
          breakdown[priority].countCreatedToStart++;
        }
        
        if (metrics.cycleTime !== null) {
          breakdown[priority].sumCycleTime += metrics.cycleTime;
          breakdown[priority].countCycleTime++;
        }
      });
      
      // Calculate averages
      ['P0', 'P1', 'P2'].forEach(p => {
        const b = breakdown[p];
        b.avgCreatedToStart = b.countCreatedToStart > 0 ? Math.round(b.sumCreatedToStart / b.countCreatedToStart) : 0;
        b.avgCycleTime = b.countCycleTime > 0 ? Math.round(b.sumCycleTime / b.countCycleTime) : 0;
        b.avgTotalAge = b.avgCreatedToStart + b.avgCycleTime;
      });
      
      return breakdown;
    };

    // Calculate breakdowns for Open and Live CRs (Actual and Forecast)
    const openActual = calculateBreakdown(openCRs, false);
    const openForecast = calculateBreakdown(openCRs, true);
    const liveActual = calculateBreakdown(liveCRs, false);
    const liveForecast = calculateBreakdown(liveCRs, true);

    // Store for table rendering
    crAgingMetrics.breakdown = {
      open: { actual: openActual, forecast: openForecast },
      live: { actual: liveActual, forecast: liveForecast }
    };

    // Calculate department breakdown for Department Distribution table
    const calculateDepartmentBreakdown = (crs, useForecast = false) => {
      const deptBreakdown = {};
      
      crs.forEach(cr => {
        const deptId = cr.departmentId || 'N/A';
        if (!deptBreakdown[deptId]) {
          deptBreakdown[deptId] = {
            P0: { qty: 0, sumCreatedToStart: 0, sumCycleTime: 0, countCreatedToStart: 0, countCycleTime: 0 },
            P1: { qty: 0, sumCreatedToStart: 0, sumCycleTime: 0, countCreatedToStart: 0, countCycleTime: 0 },
            P2: { qty: 0, sumCreatedToStart: 0, sumCycleTime: 0, countCreatedToStart: 0, countCycleTime: 0 }
          };
        }
        
        const priority = (cr.priority || 'P2').toUpperCase();
        if (!deptBreakdown[deptId][priority]) return;
        
        deptBreakdown[deptId][priority].qty++;
        const metrics = calculateAgingMetrics(cr, useForecast);
        
        if (metrics.ageCreatedToStart !== null) {
          deptBreakdown[deptId][priority].sumCreatedToStart += metrics.ageCreatedToStart;
          deptBreakdown[deptId][priority].countCreatedToStart++;
        }
        
        if (metrics.cycleTime !== null) {
          deptBreakdown[deptId][priority].sumCycleTime += metrics.cycleTime;
          deptBreakdown[deptId][priority].countCycleTime++;
        }
      });
      
      // Calculate averages for each department
      Object.keys(deptBreakdown).forEach(deptId => {
        ['P0', 'P1', 'P2'].forEach(p => {
          const b = deptBreakdown[deptId][p];
          b.avgCreatedToStart = b.countCreatedToStart > 0 ? Math.round(b.sumCreatedToStart / b.countCreatedToStart) : 0;
          b.avgCycleTime = b.countCycleTime > 0 ? Math.round(b.sumCycleTime / b.countCycleTime) : 0;
          b.avgTotalAge = b.avgCreatedToStart + b.avgCycleTime;
        });
      });
      
      return deptBreakdown;
    };

    // Calculate department breakdowns for Open and Live CRs (Actual only)
    const openDeptBreakdown = calculateDepartmentBreakdown(openCRs, false);
    const liveDeptBreakdown = calculateDepartmentBreakdown(liveCRs, false);
    
    // Store for Department Distribution table rendering
    crAgingMetrics.departmentBreakdown = {
      open: openDeptBreakdown,
      live: liveDeptBreakdown
    };

    // Keep existing calculations for backward compatibility
    (filteredCRs || []).forEach(cr => {
      const metrics = calculateAgingMetrics(cr, false);
      crAgingMetrics.byId[cr.id] = metrics;

      if (metrics.totalAge !== null) {
        sumTotalAge += metrics.totalAge;
        countTotalAge++;
      }
      if (metrics.ageCreatedToStart !== null) {
        sumCreatedToStart += metrics.ageCreatedToStart;
        countCreatedToStart++;
      }
      if (metrics.cycleTime !== null) {
        sumCycleTime += metrics.cycleTime;
        countCycleTime++;
      }
    });

    crAgingMetrics = {
      avgTotalAge: countTotalAge ? Math.round(sumTotalAge / countTotalAge) : 0,
      avgAgeCreatedToStart: countCreatedToStart ? Math.round(sumCreatedToStart / countCreatedToStart) : 0,
      avgCycleTime: countCycleTime ? Math.round(sumCycleTime / countCycleTime) : 0,
      counts: { totalAge: countTotalAge, createdToStart: countCreatedToStart, cycleTime: countCycleTime },
      byId: crAgingMetrics.byId,
      breakdown: crAgingMetrics.breakdown,
      departmentBreakdown: crAgingMetrics.departmentBreakdown || { open: {}, live: {} }
    };
  } catch (e) {
    console.warn('Failed to compute CR aging metrics from initiatives:', e);
  }
  
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
            const statusClass = item[labelKey]?.toLowerCase().replace(/\s+/g, '-') || '';
            const filterValue = item[labelKey] || '';
            const clickableStyle = clickable ? 'cursor: pointer;' : '';
            const clickableClass = clickable ? 'clickable-chart-item' : '';
            const dataAttrs = clickable ? `data-filter-type="${labelKey}" data-filter-value="${filterValue.replace(/"/g, '&quot;')}" data-title="${title}: ${filterValue.replace(/"/g, '&quot;')}" data-initiative-type="CR"` : '';
            return `
              <div class="${clickableClass}" ${dataAttrs} style="display: flex; align-items: center; margin-bottom: 12px; ${clickableStyle}">
                <div style="width: 120px; font-size: 12px; color: var(--muted);">${item[labelKey] || 'N/A'}</div>
                <div style="flex: 1; margin: 0 12px;">
                  <div style="background: #f1f5f9; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: ${statusClass.includes('live') ? '#3b82f6' : statusClass.includes('at-risk') ? '#f59e0b' : statusClass.includes('delayed') ? '#ef4444' : '#6366f1'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
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
  
  // Create bar chart with breakdown
  const createBarChartWithBreakdown = (data, labelKey, valueKey, title, breakdownData, breakdownType, clickable = false) => {
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
            const statusClass = item[labelKey]?.toLowerCase().replace(/\s+/g, '-') || '';
            const filterValue = item[labelKey] || '';
            const clickableStyle = clickable ? 'cursor: pointer;' : '';
            const clickableClass = clickable ? 'clickable-chart-item' : '';
            const dataAttrs = clickable ? `data-filter-type="${labelKey}" data-filter-value="${filterValue.replace(/"/g, '&quot;')}" data-title="${title}: ${filterValue.replace(/"/g, '&quot;')}" data-initiative-type="CR"` : '';
            
            // Get breakdown for this item
            const breakdown = breakdownData && breakdownData[filterValue] ? breakdownData[filterValue] : null;
            let breakdownHtml = '';
            
            if (breakdown) {
              if (breakdownType === 'priority') {
                // Breakdown by Priority (P0, P1, P2)
                const p0 = breakdown.P0 || 0;
                const p1 = breakdown.P1 || 0;
                const p2 = breakdown.P2 || 0;
                const totalBreakdown = p0 + p1 + p2;
                if (totalBreakdown > 0) {
                  breakdownHtml = `
                    <div style="margin-top: 6px; padding-left: 132px; font-size: 11px; color: var(--muted); display: flex; gap: 12px;">
                      ${p0 > 0 ? `<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 2px;"></span>P0: ${p0}</span>` : ''}
                      ${p1 > 0 ? `<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 8px; height: 8px; background: #f59e0b; border-radius: 2px;"></span>P1: ${p1}</span>` : ''}
                      ${p2 > 0 ? `<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 2px;"></span>P2: ${p2}</span>` : ''}
                    </div>
                  `;
                }
              } else if (breakdownType === 'status') {
                // Breakdown by Status
                const statusKeys = Object.keys(breakdown).sort();
                if (statusKeys.length > 0) {
                  breakdownHtml = `
                    <div style="margin-top: 6px; padding-left: 132px; font-size: 11px; color: var(--muted); display: flex; gap: 12px; flex-wrap: wrap;">
                      ${statusKeys.map(status => {
                        const count = breakdown[status] || 0;
                        if (count > 0) {
                          const statusClass = status.toLowerCase().replace(/\s+/g, '-');
                          const color = statusClass.includes('live') ? '#3b82f6' : statusClass.includes('at-risk') ? '#f59e0b' : statusClass.includes('delayed') ? '#ef4444' : '#6366f1';
                          return `<span style="display: inline-flex; align-items: center; gap: 4px;"><span style="display: inline-block; width: 8px; height: 8px; background: ${color}; border-radius: 2px;"></span>${status}: ${count}</span>`;
                        }
                        return '';
                      }).filter(Boolean).join('')}
                    </div>
                  `;
                }
              }
            }
            
            return `
              <div style="margin-bottom: ${breakdownHtml ? '16px' : '12px'};">
                <div class="${clickableClass}" ${dataAttrs} style="display: flex; align-items: center; ${clickableStyle}">
                  <div style="width: 120px; font-size: 12px; color: var(--muted);">${item[labelKey] || 'N/A'}</div>
                  <div style="flex: 1; margin: 0 12px;">
                    <div style="background: #f1f5f9; height: 20px; border-radius: 10px; overflow: hidden;">
                      <div style="background: ${statusClass.includes('live') ? '#3b82f6' : statusClass.includes('at-risk') ? '#f59e0b' : statusClass.includes('delayed') ? '#ef4444' : '#6366f1'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                    </div>
                  </div>
                  <div style="width: 40px; text-align: right; font-weight: 600; font-size: 14px;">${item[valueKey] || 0}</div>
                </div>
                ${breakdownHtml}
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
      // Only include active users with (Role: IT AND Type: Manager) OR Admin
      if (u.active === false) return false;
      const role = (u.role || '').toLowerCase().trim();
      const type = (u.type || '').toLowerCase().trim();
      const isAdmin = u.isAdmin === true || u.isAdmin === 1 || role === 'admin' || role === 'administrator';
      return isAdmin || (role === 'it' && type === 'manager');
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
        <div style="font-size:32px;font-weight:700;color: #3b82f6">${d.liveCount || 0}</div>
      </div>
      <div class="card clickable-card" data-filter-type="status" data-filter-value="NOT STARTED" data-title="Not Started CRs" data-initiative-type="CR" style="cursor: pointer;">
        <div class="muted">Not Started CRs</div>
        <div style="font-size:32px;font-weight:700;color: var(--muted)">${(() => {
          const notStartedStatus = (d.byStatus || []).find(s => String(s.status || '').toUpperCase().trim() === 'NOT STARTED');
          return notStartedStatus ? (notStartedStatus.c || 0) : 0;
        })()}</div>
      </div>
      <div class="card" style="border-left: 4px solid var(--success);">
        <div class="muted">In Progress CRs</div>
        <div style="font-size:32px;font-weight:700;color: var(--success)">${(() => {
          const onTrackStatus = (d.byStatus || []).find(s => String(s.status || '').toUpperCase().trim() === 'ON TRACK');
          const onTrackCRs = onTrackStatus ? (onTrackStatus.c || 0) : 0;
          const atRiskStatus = (d.byStatus || []).find(s => String(s.status || '').toUpperCase().trim() === 'AT RISK');
          const atRiskCRs = atRiskStatus ? (atRiskStatus.c || 0) : 0;
          const delayedStatus = (d.byStatus || []).find(s => String(s.status || '').toUpperCase().trim() === 'DELAYED');
          const delayedCRs = delayedStatus ? (delayedStatus.c || 0) : 0;
          return onTrackCRs + atRiskCRs + delayedCRs;
        })()}</div>
        <div class="muted" style="margin-top: 6px; font-size: 12px;">
          On Track + At Risk + Delayed
        </div>
      </div>
      <div class="card" style="border-left: 4px solid var(--warning);">
        <div class="muted">Average CR Aging (Days)</div>
        <div style="display:flex; align-items:baseline; justify-content: space-between; gap: 12px; margin-top: 6px;">
          <div>
            <div style="font-size:12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px;">Avg Total Age</div>
            <div style="font-size:34px;font-weight:800;color: var(--warning); line-height: 1;">${crAgingMetrics.avgTotalAge}</div>
          </div>
          <div style="font-size: 12px; color: var(--muted); text-align: right;">
            <div><strong>${crAgingMetrics.avgAgeCreatedToStart}</strong> Avg Age Created→Start</div>
            <div><strong>${crAgingMetrics.avgCycleTime}</strong> Avg Cycle Time (Start→End)</div>
          </div>
        </div>
        <div class="muted" style="margin-top: 10px; font-size: 12px;">
          Total Age = (Create→Start) + (Start→End/Now). For ongoing CRs, End uses today.
        </div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      ${createBarChartWithBreakdown(d.byStatus || [], 'status', 'c', 'Status Distribution', d.byStatusBreakdown, 'priority', true)}
      ${createBarChartWithBreakdown(d.byPriority || [], 'priority', 'c', 'Priority Distribution', d.byPriorityBreakdown, 'status', true)}
      ${createBarChartWithBreakdown(d.byMilestone || [], 'milestone', 'c', 'Milestone Distribution', d.byMilestoneBreakdown, 'priority', true)}
    </div>
    <div class="grid" style="margin-top:24px">
      <div class="card" style="grid-column: 1 / -1;">
        <h3>CR Aging (Total Age)</h3>
        <div style="margin-top: 16px; overflow-x: auto;">
          ${(() => {
            const breakdown = crAgingMetrics.breakdown || {};
            const open = breakdown.open || { actual: {}, forecast: {} };
            const live = breakdown.live || { actual: {}, forecast: {} };
            
            const renderCell = (value, isHeader = false, bgColor = '', whiteText = false) => {
              const baseStyle = isHeader 
                ? 'padding: 8px 12px; font-weight: 600; text-align: center; border: 1px solid #e2e8f0;'
                : 'padding: 8px 12px; font-weight: 600; text-align: center; border: 1px solid #e2e8f0;';
              const bgStyle = bgColor ? ` background: ${bgColor};` : '';
              const textColor = (whiteText || bgColor === '#475569') ? ' color: white;' : '';
              return `<td style="${baseStyle}${bgStyle}${textColor}">${value}</td>`;
            };
            
            const renderDataCells = (data, rowType) => {
              const actual = data.actual || {};
              const forecast = data.forecast || {};
              
              let cells = '';
              if (rowType === 'qty') {
                // Total CRs - blue background for both Actual and Forecast
                cells = `
                  ${renderCell(actual.P0?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(actual.P1?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(actual.P2?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(forecast.P0?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(forecast.P1?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(forecast.P2?.qty || 0, false, '#3b82f6', true)}
                `;
              } else if (rowType === 'rec-start') {
                cells = `
                  ${renderCell(actual.P0?.avgCreatedToStart || 0)}
                  ${renderCell(actual.P1?.avgCreatedToStart || 0)}
                  ${renderCell(actual.P2?.avgCreatedToStart || 0)}
                  ${renderCell(forecast.P0?.avgCreatedToStart || 0, false, '#475569')}
                  ${renderCell(forecast.P1?.avgCreatedToStart || 0, false, '#475569')}
                  ${renderCell(forecast.P2?.avgCreatedToStart || 0, false, '#475569')}
                `;
              } else if (rowType === 'start-live') {
                cells = `
                  ${renderCell(actual.P0?.avgCycleTime || 0)}
                  ${renderCell(actual.P1?.avgCycleTime || 0)}
                  ${renderCell(actual.P2?.avgCycleTime || 0)}
                  ${renderCell(forecast.P0?.avgCycleTime || 0, false, '#475569')}
                  ${renderCell(forecast.P1?.avgCycleTime || 0, false, '#475569')}
                  ${renderCell(forecast.P2?.avgCycleTime || 0, false, '#475569')}
                `;
              } else if (rowType === 'total-age') {
                // Avg Total Age - green background for both Actual and Forecast
                cells = `
                  ${renderCell(actual.P0?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(actual.P1?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(actual.P2?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(forecast.P0?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(forecast.P1?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(forecast.P2?.avgTotalAge || 0, false, '#10b981', true)}
                `;
              }
              
              return cells;
            };
            
            return `
              <table style="width: 100%; border-collapse: collapse; min-width: 600px; font-size: 13px;">
                <thead>
                  <tr>
                    <th rowspan="2" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: left; font-weight: 600;"></th>
                    <th rowspan="2" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: left; font-weight: 600;"></th>
                    <th colspan="3" style="padding: 12px; background: #fbbf24; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: white;">Actual</th>
                    <th colspan="3" style="padding: 12px; background: #475569; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: white;">Forecast</th>
                  </tr>
                  <tr>
                    <th style="padding: 8px; background: #fef3c7; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #000;">P0</th>
                    <th style="padding: 8px; background: #fef3c7; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #000;">P1</th>
                    <th style="padding: 8px; background: #fef3c7; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #000;">P2</th>
                    <th style="padding: 8px; background: #475569; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: white;">P0</th>
                    <th style="padding: 8px; background: #475569; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: white;">P1</th>
                    <th style="padding: 8px; background: #475569; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: white;">P2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background: #fef3c7;">
                    <td rowspan="4" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; vertical-align: middle; text-align: center;">Open</td>
                    <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #3b82f6; color: white;">Total CRs</td>
                    ${renderDataCells(open, 'qty')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Age Created→Start</td>
                    ${renderDataCells(open, 'rec-start')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Cycle Time (Start→End)</td>
                    ${renderDataCells(open, 'start-live')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #10b981; color: white;">Avg Total Age</td>
                    ${renderDataCells(open, 'total-age')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td rowspan="4" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; vertical-align: middle; text-align: center;">Closed</td>
                    <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #3b82f6; color: white;">Total CRs</td>
                    ${renderDataCells(live, 'qty')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Age Created→Start</td>
                    ${renderDataCells(live, 'rec-start')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Cycle Time (Start→End)</td>
                    ${renderDataCells(live, 'start-live')}
                  </tr>
                  <tr style="background: #fef3c7;">
                    <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #10b981; color: white;">Avg Total Age</td>
                    ${renderDataCells(live, 'total-age')}
                  </tr>
                </tbody>
              </table>
            `;
          })()}
        </div>
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: var(--muted);">
          <strong>Note:</strong> Days (Actual) uses Create Date, Actual Start Date, and Actual End Date. Forecast uses Create Date, Plan Start Date, and Plan End Date. Rec-Start = Avg Age Created → Start. Start-Live = Avg Cycle Time (Start → End/Live).
        </div>
      </div>
      ${d.goLiveRateData && d.goLiveRateData.length > 0 ? `
      <div class="card" style="grid-column: 1 / -1; margin-top: 24px;">
        <h3>Go Live Rate (2M Moving Average)</h3>
        <div style="margin-top: 16px;">
          ${(() => {
            const data = d.goLiveRateData;
            
            // Calculate max value for scaling (use moving average and benchmark)
            const benchmarkValue = 7;
            const maxValue = Math.max(
              ...data.flatMap(d => [
                d.movingAvg2M.P0 || 0,
                d.movingAvg2M.P1 || 0,
                d.movingAvg2M.P2 || 0,
                d.movingAvg2M.Total || 0
              ]),
              benchmarkValue,
              1
            );
            
            const chartHeight = 400;
            const chartPadding = { top: 30, right: 50, bottom: 90, left: 70 };
            const chartWidth = Math.max(900, data.length * 70);
            const usableWidth = chartWidth - chartPadding.left - chartPadding.right;
            const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
            
            // Generate points for moving average lines only
            const generatePoints = (key) => {
              return data.map((item, index) => {
                const x = chartPadding.left + (index / (data.length - 1 || 1)) * usableWidth;
                const value = item.movingAvg2M[key];
                const y = chartPadding.top + usableHeight - (value / maxValue) * usableHeight;
                return { x, y, value, month: item.monthLabel };
              });
            };
            
            const pointsP0MA = generatePoints('P0');
            const pointsP1MA = generatePoints('P1');
            const pointsP2MA = generatePoints('P2');
            const pointsTotalMA = generatePoints('Total');
            
            // Generate path strings
            const generatePath = (points) => {
              if (points.length === 0) return '';
              if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
              return points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
            };
            
            // Generate grid lines
            const gridLines = [];
            const gridSteps = Math.ceil(maxValue) <= 10 ? Math.ceil(maxValue) : 10;
            for (let i = 0; i <= gridSteps; i++) {
              const y = chartPadding.top + (i / gridSteps) * usableHeight;
              const value = maxValue - (i / gridSteps) * maxValue;
              const displayValue = maxValue <= 10 ? value.toFixed(1) : Math.round(value);
              gridLines.push(`<line x1="${chartPadding.left}" y1="${y}" x2="${chartPadding.left + usableWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>`);
              gridLines.push(`<text x="${chartPadding.left - 15}" y="${y + 5}" text-anchor="end" font-size="12" fill="#475569" font-weight="500">${displayValue}</text>`);
            }
            
            // Generate X-axis labels
            const xAxisLabels = data.map((item, index) => {
              const x = chartPadding.left + (index / (data.length - 1 || 1)) * usableWidth;
              return `<text x="${x}" y="${chartHeight - chartPadding.bottom + 25}" text-anchor="middle" font-size="12" fill="#475569" font-weight="500" transform="rotate(-45 ${x} ${chartHeight - chartPadding.bottom + 25})">${item.monthLabel}</text>`;
            });
            
            return `
              <div style="overflow-x: auto; padding: 24px; border: 1px solid #e2e8f0; background: linear-gradient(to bottom, #ffffff, #f8fafc); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <svg width="${chartWidth}" height="${chartHeight}" style="min-width: ${chartWidth}px;">
                  <!-- Grid lines -->
                  ${gridLines.join('')}
                  
                  <!-- Y-axis label -->
                  <text x="${chartPadding.left / 2}" y="${chartHeight / 2}" text-anchor="middle" font-size="13" fill="#334155" font-weight="600" transform="rotate(-90 ${chartPadding.left / 2} ${chartHeight / 2})">Count CRs</text>
                  
                  <!-- X-axis label -->
                  <text x="${chartWidth / 2}" y="${chartHeight - 15}" text-anchor="middle" font-size="13" fill="#334155" font-weight="600">Date (Month)</text>
                  
                  <!-- Moving Average Lines (solid, more prominent) -->
                  <path d="${generatePath(pointsP0MA)}" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="${generatePath(pointsP1MA)}" stroke="#3b82f6" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="${generatePath(pointsP2MA)}" stroke="#10b981" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="${generatePath(pointsTotalMA)}" stroke="#8b5cf6" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  
                  <!-- Benchmark Line (horizontal at value 7) -->
                  ${(() => {
                    const y = chartPadding.top + usableHeight - (benchmarkValue / maxValue) * usableHeight;
                    return `
                      <line x1="${chartPadding.left}" y1="${y}" x2="${chartPadding.left + usableWidth}" y2="${y}" stroke="#f97316" stroke-width="2.5" stroke-dasharray="8,6" />
                      <text x="${chartPadding.left + usableWidth}" y="${y - 6}" text-anchor="end" font-size="11" fill="#f97316" font-weight="600">
                        Benchmark (7)
                      </text>
                    `;
                  })()}
                  
                  <!-- Data points for Moving Average -->
                  ${pointsP0MA.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#ef4444" stroke="white" stroke-width="2" class="chart-point-ma" data-value="${p.value.toFixed(1)}" data-month="${p.month}" data-priority="P0" style="cursor: pointer;" title="P0 2M Avg: ${p.value.toFixed(1)} (${p.month})"/>`).join('')}
                  ${pointsP1MA.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#3b82f6" stroke="white" stroke-width="2" class="chart-point-ma" data-value="${p.value.toFixed(1)}" data-month="${p.month}" data-priority="P1" style="cursor: pointer;" title="P1 2M Avg: ${p.value.toFixed(1)} (${p.month})"/>`).join('')}
                  ${pointsP2MA.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#10b981" stroke="white" stroke-width="2" class="chart-point-ma" data-value="${p.value.toFixed(1)}" data-month="${p.month}" data-priority="P2" style="cursor: pointer;" title="P2 2M Avg: ${p.value.toFixed(1)} (${p.month})"/>`).join('')}
                  ${pointsTotalMA.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#8b5cf6" stroke="white" stroke-width="2" class="chart-point-ma" data-value="${p.value.toFixed(1)}" data-month="${p.month}" data-priority="Total" style="cursor: pointer;" title="Total 2M Avg: ${p.value.toFixed(1)} (${p.month})"/>`).join('')}
                  
                  <!-- X-axis labels -->
                  ${xAxisLabels.join('')}
                  
                  <!-- Y-axis line -->
                  <line x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartPadding.top + usableHeight}" stroke="#334155" stroke-width="2.5"/>
                  
                  <!-- X-axis line -->
                  <line x1="${chartPadding.left}" y1="${chartPadding.top + usableHeight}" x2="${chartPadding.left + usableWidth}" y2="${chartPadding.top + usableHeight}" stroke="#334155" stroke-width="2.5"/>
                </svg>
              </div>
              
              <!-- Legend -->
              <div style="padding: 20px; background: linear-gradient(to bottom, #f8fafc, #ffffff); border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="width: 50px; height: 4px; background: #ef4444; border-radius: 2px;"></div>
                    <div>
                      <div style="font-size: 14px; color: #1e293b; font-weight: 600;">P0</div>
                      <div style="font-size: 11px; color: #64748b;">Priority 0</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="width: 50px; height: 4px; background: #3b82f6; border-radius: 2px;"></div>
                    <div>
                      <div style="font-size: 14px; color: #1e293b; font-weight: 600;">P1</div>
                      <div style="font-size: 11px; color: #64748b;">Priority 1</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="width: 50px; height: 4px; background: #10b981; border-radius: 2px;"></div>
                    <div>
                      <div style="font-size: 14px; color: #1e293b; font-weight: 600;">P2</div>
                      <div style="font-size: 11px; color: #64748b;">Priority 2</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="width: 50px; height: 4px; background: #8b5cf6; border-radius: 2px;"></div>
                    <div>
                      <div style="font-size: 14px; color: #1e293b; font-weight: 600;">Total</div>
                      <div style="font-size: 11px; color: #64748b;">P0 + P1 + P2</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 8px; border: 1px solid #fee2e2;">
                    <div style="width: 50px; height: 0; border-top: 3px dashed #f97316; border-radius: 2px;"></div>
                    <div>
                      <div style="font-size: 14px; color: #1e293b; font-weight: 600;">Benchmark</div>
                      <div style="font-size: 11px; color: #64748b;">Target = 7 CRs per month</div>
                    </div>
                  </div>
                </div>
                <div style="padding: 12px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <div style="font-size: 12px; color: #475569; line-height: 1.6;">
                    <span style="font-weight: 700; color: #1e293b;">📈 2-Month Moving Average:</span> <span style="color: #64748b;">Smoothed trend showing the average count of CRs that went live over the current and previous month</span><br/>
                    <span style="font-weight: 700; color: #f97316;">📏 Benchmark (7):</span> <span style="color: #64748b;">Target threshold for monthly go-lives</span>
                  </div>
                </div>
              </div>
            `;
          })()}
        </div>
      </div>
      ` : ''}
      ${d.openBurndownData && d.openBurndownData.length > 0 ? `
      <div class="card" style="grid-column: 1 / -1; margin-top: 24px;">
        <h3>CR Open Project Burndown (Weekly)</h3>
        <div style="margin-top: 16px;">
          ${(() => {
            const data = d.openBurndownData;

            const maxValue = Math.max(
              ...data.flatMap(w => [w.P0 || 0, w.P1 || 0, w.P2 || 0, w.Total || 0]),
              1
            );

            const chartHeight = 360;
            const chartPadding = { top: 30, right: 40, bottom: 90, left: 70 };
            // Chart width will be calculated after determining prediction needs
            let chartWidth = Math.max(900, data.length * 80);
            let usableWidth = chartWidth - chartPadding.left - chartPadding.right;
            const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;

            // This will be updated after we calculate the final chart width
            let generatePoints = null;

            // Points will be generated after we calculate the extended data
            let pointsP0, pointsP1, pointsP2, pointsTotal;

            // Generate points for historical lines only (no prediction)
            generatePoints = (key) => {
              return data.map((item, index) => {
                const x = chartPadding.left + (index / (data.length - 1 || 1)) * usableWidth;
                const value = item[key] || 0;
                const y = chartPadding.top + usableHeight - (value / maxValue) * usableHeight;
                return { x, y, value, label: item.weekLabel || item.weekEnd || '' };
              });
            };
            
            // Generate points for historical lines
            pointsP0 = generatePoints('P0');
            pointsP1 = generatePoints('P1');
            pointsP2 = generatePoints('P2');
            pointsTotal = generatePoints('Total');

            const generatePath = (points) => {
              if (points.length === 0) return '';
              if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
              return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
            };

            const gridLines = [];
            const gridSteps = Math.ceil(maxValue) <= 10 ? Math.ceil(maxValue) : 10;
            for (let i = 0; i <= gridSteps; i++) {
              const y = chartPadding.top + (i / gridSteps) * usableHeight;
              const value = maxValue - (i / gridSteps) * maxValue;
              const displayValue = maxValue <= 10 ? value.toFixed(1) : Math.round(value);
              gridLines.push(
                `<line x1="${chartPadding.left}" y1="${y}" x2="${chartPadding.left + usableWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>`
              );
              gridLines.push(
                `<text x="${chartPadding.left - 15}" y="${y + 5}" text-anchor="end" font-size="12" fill="#475569" font-weight="500">${displayValue}</text>`
              );
            }

            // Generate x-axis labels for historical weeks only
            const xAxisLabels = data.map((item, index) => {
              const x = chartPadding.left + (index / (data.length - 1 || 1)) * usableWidth;
              const label = item.weekLabel || item.weekEnd || '';
              return `<text x="${x}" y="${chartHeight - chartPadding.bottom + 25}" text-anchor="middle" font-size="11" fill="#475569" transform="rotate(-45 ${x} ${chartHeight - chartPadding.bottom + 25})">${label}</text>`;
            });

            return `
              <div style="overflow-x: auto; padding: 20px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 12px;">
                <svg width="${chartWidth}" height="${chartHeight}" style="min-width: ${chartWidth}px;">
                  ${gridLines.join('')}

                  <text x="${chartPadding.left / 2}" y="${chartHeight / 2}" text-anchor="middle" font-size="13" fill="#334155" font-weight="600" transform="rotate(-90 ${chartPadding.left / 2} ${chartHeight / 2})">Open CRs</text>
                  <text x="${chartWidth / 2}" y="${chartHeight - 15}" text-anchor="middle" font-size="13" fill="#334155" font-weight="600">Week</text>

                  <path d="${generatePath(pointsP0)}" stroke="#ef4444" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="${generatePath(pointsP1)}" stroke="#3b82f6" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="${generatePath(pointsP2)}" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="${generatePath(pointsTotal)}" stroke="#8b5cf6" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

                  ${pointsP0.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ef4444" stroke="white" stroke-width="2" title="P0 Open: ${p.value} (${p.label})"/>`).join('')}
                  ${pointsP1.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#3b82f6" stroke="white" stroke-width="2" title="P1 Open: ${p.value} (${p.label})"/>`).join('')}
                  ${pointsP2.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#10b981" stroke="white" stroke-width="2" title="P2 Open: ${p.value} (${p.label})"/>`).join('')}
                  ${pointsTotal.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#8b5cf6" stroke="white" stroke-width="2" title="Total Open: ${p.value} (${p.label})"/>`).join('')}
                  

                  ${xAxisLabels.join('')}

                  <line x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartPadding.top + usableHeight}" stroke="#334155" stroke-width="2.5"/>
                  <line x1="${chartPadding.left}" y1="${chartPadding.top + usableHeight}" x2="${chartPadding.left + usableWidth}" y2="${chartPadding.top + usableHeight}" stroke="#334155" stroke-width="2.5"/>
                </svg>
              </div>
              <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 4px; background: #ef4444; border-radius: 2px;"></div>
                    <span style="font-size: 12px; color: #1e293b; font-weight: 600;">P0</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 4px; background: #3b82f6; border-radius: 2px;"></div>
                    <span style="font-size: 12px; color: #1e293b; font-weight: 600;">P1</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 4px; background: #10b981; border-radius: 2px;"></div>
                    <span style="font-size: 12px; color: #1e293b; font-weight: 600;">P2</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 4px; background: #8b5cf6; border-radius: 2px;"></div>
                    <span style="font-size: 12px; color: #1e293b; font-weight: 600;">Total (P0+P1+P2)</span>
                  </div>
                </div>
                <div style="font-size: 12px; color: #475569; text-align: center;">
                  Showing how many CRs are still open each week (Status ≠ LIVE and ≠ CANCELLED), broken down by priority.
                </div>
              </div>
            `;
          })()}
        </div>
      </div>
      ${(() => {
        // CR Open to Closed Forecasting Table
        const monthlyOpenCRs = d.monthlyOpenCRs || [];
        const goLiveRateData = d.goLiveRateData || [];
        
        if (monthlyOpenCRs.length === 0) {
          return '';
        }
        
        // Calculate forecasting data for each month
        const forecastingData = monthlyOpenCRs.map(monthInfo => {
          // Get 2M Moving Average for this month from goLiveRateData
          // Try to find by monthKey first, then by month field, then by monthLabel
          let monthData = goLiveRateData.find(m => (m.monthKey || m.month) === monthInfo.monthKey);
          if (!monthData) {
            // Fallback: try to find by monthLabel
            monthData = goLiveRateData.find(m => m.monthLabel === monthInfo.monthLabel);
          }
          const movingAvg2M = monthData?.movingAvg2M?.Total || 0;
          
          // Calculate forecast based on Benchmark (7 CRs/month)
          const benchmarkRate = 7;
          const monthsToCompleteBenchmark = monthInfo.openCRs > 0 ? Math.ceil(monthInfo.openCRs / benchmarkRate) : 0;
          const forecastBenchmark = monthsToCompleteBenchmark > 0 ? (() => {
            const forecastDate = new Date(monthInfo.year, monthInfo.month - 1 + monthsToCompleteBenchmark, 1);
            return forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          })() : '-';
          
          // Calculate forecast based on 2M Moving Average
          // Always calculate if we have openCRs, even if movingAvg2M is small
          let forecast2M = '-';
          if (monthInfo.openCRs > 0) {
            if (movingAvg2M > 0) {
              const monthsToComplete2M = Math.ceil(monthInfo.openCRs / movingAvg2M);
              if (monthsToComplete2M > 0) {
                const forecastDate = new Date(monthInfo.year, monthInfo.month - 1 + monthsToComplete2M, 1);
                forecast2M = forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              }
            } else {
              // If movingAvg2M is 0, it means no CRs were delivered, so it will never complete
              forecast2M = 'N/A';
            }
          }
          
          return {
            month: monthInfo.monthLabel,
            openCRs: monthInfo.openCRs,
            forecastBenchmark,
            forecast2M
          };
        });
        
        return `
      <div class="card" style="grid-column: 1 / -1; margin-top: 24px;">
        <h3>CR Open to Closed Forecasting</h3>
        <div style="margin-top: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #e0f2fe;">
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #1e293b; border-bottom: 2px solid #cbd5e1;">Month</th>
                <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #1e293b; border-bottom: 2px solid #cbd5e1;">No of CR Open</th>
                <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #1e293b; border-bottom: 2px solid #cbd5e1;">Forecast All CR completed on Benchmark (7 CRs/month)</th>
                <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #1e293b; border-bottom: 2px solid #cbd5e1;">Forecast All CR completed based on Total 2M Moving Average</th>
              </tr>
            </thead>
            <tbody>
              ${forecastingData.map((row, idx) => `
                <tr style="${idx % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'} border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${row.month}</td>
                  <td style="padding: 12px 16px; text-align: center; color: #475569;">${row.openCRs}</td>
                  <td style="padding: 12px 16px; text-align: center; color: #475569;">${row.forecastBenchmark}</td>
                  <td style="padding: 12px 16px; text-align: center; color: #475569;">${row.forecast2M}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      `;
      })()}
      ` : ''}
      <div class="card" style="grid-column: 1 / -1;">
        <h3>Department Distribution</h3>
        <div style="margin-top: 16px; overflow-x: auto;">
          ${(() => {
            // Get department breakdown from crAgingMetrics
            const deptBreakdown = crAgingMetrics.departmentBreakdown || {};
            const openDeptBreakdown = deptBreakdown.open || {};
            const liveDeptBreakdown = deptBreakdown.live || {};
            
            // Get all unique departments
            const allDeptIds = new Set([
              ...Object.keys(openDeptBreakdown),
              ...Object.keys(liveDeptBreakdown)
            ]);
            
            if (allDeptIds.size === 0) {
              return '<p class="muted">No department data available</p>';
            }
            
            const renderCell = (value, isHeader = false, bgColor = '', whiteText = false) => {
              const baseStyle = isHeader 
                ? 'padding: 8px 12px; font-weight: 600; text-align: center; border: 1px solid #e2e8f0;'
                : 'padding: 8px 12px; font-weight: 600; text-align: center; border: 1px solid #e2e8f0;';
              const bgStyle = bgColor ? ` background: ${bgColor};` : '';
              const textColor = (whiteText || bgColor === '#475569') ? ' color: white;' : '';
              return `<td style="${baseStyle}${bgStyle}${textColor}">${value}</td>`;
            };
            
            const renderDataCells = (deptData, rowType) => {
              if (!deptData) {
                return `
                  ${renderCell(0, false, rowType === 'qty' ? '#3b82f6' : '', rowType === 'qty')}
                  ${renderCell(0, false, rowType === 'qty' ? '#3b82f6' : '', rowType === 'qty')}
                  ${renderCell(0, false, rowType === 'qty' ? '#3b82f6' : '', rowType === 'qty')}
                `;
              }
              
              let cells = '';
              if (rowType === 'qty') {
                // Total CRs - blue background
                cells = `
                  ${renderCell(deptData.P0?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(deptData.P1?.qty || 0, false, '#3b82f6', true)}
                  ${renderCell(deptData.P2?.qty || 0, false, '#3b82f6', true)}
                `;
              } else if (rowType === 'rec-start') {
                cells = `
                  ${renderCell(deptData.P0?.avgCreatedToStart || 0)}
                  ${renderCell(deptData.P1?.avgCreatedToStart || 0)}
                  ${renderCell(deptData.P2?.avgCreatedToStart || 0)}
                `;
              } else if (rowType === 'start-live') {
                cells = `
                  ${renderCell(deptData.P0?.avgCycleTime || 0)}
                  ${renderCell(deptData.P1?.avgCycleTime || 0)}
                  ${renderCell(deptData.P2?.avgCycleTime || 0)}
                `;
              } else if (rowType === 'total-age') {
                // Avg Total Age - green background
                cells = `
                  ${renderCell(deptData.P0?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(deptData.P1?.avgTotalAge || 0, false, '#10b981', true)}
                  ${renderCell(deptData.P2?.avgTotalAge || 0, false, '#10b981', true)}
                `;
              }
              
              return cells;
            };
            
            // Sort departments by name
            const sortedDepts = Array.from(allDeptIds).map(deptId => ({
              id: deptId,
              name: nameById(LOOKUPS.departments, deptId) || deptId
            })).sort((a, b) => a.name.localeCompare(b.name));
            
            return `
              <table style="width: 100%; border-collapse: collapse; min-width: 600px; font-size: 13px;">
                <thead>
                  <tr>
                    <th rowspan="2" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: left; font-weight: 600;">Department</th>
                    <th rowspan="2" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: left; font-weight: 600;"></th>
                    <th rowspan="2" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: left; font-weight: 600;"></th>
                    <th colspan="3" style="padding: 12px; background: #fbbf24; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: white;">Actual</th>
                  </tr>
                  <tr>
                    <th style="padding: 8px; background: #fef3c7; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #000;">P0</th>
                    <th style="padding: 8px; background: #fef3c7; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #000;">P1</th>
                    <th style="padding: 8px; background: #fef3c7; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #000;">P2</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedDepts.map(dept => {
                    const openData = openDeptBreakdown[dept.id];
                    const liveData = liveDeptBreakdown[dept.id];
                    const deptId = dept.id;
                    const deptName = dept.name;
                    
                    return `
                      <tr style="background: #fef3c7;">
                        <td rowspan="8" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; vertical-align: middle; text-align: left;">
                          <div class="clickable-chart-item" data-filter-type="departmentId" data-filter-value="${deptId}" data-title="Department: ${deptName}" data-initiative-type="CR" style="cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">${deptName}</div>
                        </td>
                        <td rowspan="4" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; vertical-align: middle; text-align: center;">Open</td>
                        <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #3b82f6; color: white;">Total CRs</td>
                        ${renderDataCells(openData, 'qty')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Age Created→Start</td>
                        ${renderDataCells(openData, 'rec-start')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Cycle Time (Start→End)</td>
                        ${renderDataCells(openData, 'start-live')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #10b981; color: white;">Avg Total Age</td>
                        ${renderDataCells(openData, 'total-age')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td rowspan="4" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; vertical-align: middle; text-align: center;">Closed</td>
                        <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #3b82f6; color: white;">Total CRs</td>
                        ${renderDataCells(liveData, 'qty')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Age Created→Start</td>
                        ${renderDataCells(liveData, 'rec-start')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; background: #fef3c7;">Avg Cycle Time (Start→End)</td>
                        ${renderDataCells(liveData, 'start-live')}
                      </tr>
                      <tr style="background: #fef3c7;">
                        <td style="padding: 8px 12px; font-weight: 700; text-align: left; border: 1px solid #e2e8f0; background: #10b981; color: white;">Avg Total Age</td>
                        ${renderDataCells(liveData, 'total-age')}
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `;
          })()}
        </div>
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: var(--muted);">
          <strong>Note:</strong> Days (Actual) uses Create Date, Actual Start Date, and Actual End Date. Rec-Start = Avg Age Created → Start. Start-Live = Avg Cycle Time (Start → End/Live).
        </div>
      </div>
      ${d.weeklyTrendData && d.weeklyTrendData.length > 0 ? `
      <div class="card" style="margin-top: 24px; grid-column: 1 / -1;">
        <h3>📈 CR Weekly Trend</h3>
        <div style="margin-top: 16px;">
          ${(() => {
            // Calculate max value for scaling
            const maxValue = Math.max(
              ...d.weeklyTrendData.map(w => Math.max(w.newCRs || 0, w.liveCRs || 0)),
              1 // Ensure at least 1 to avoid division by zero
            );
            const chartHeight = 300;
            const chartPadding = 40;
            const usableHeight = chartHeight - chartPadding;
            
            return `
              <div style="position: relative; padding: 20px; border: 1px solid var(--border); background: white; border-radius: 8px;">
                <!-- Y-axis labels -->
                <div style="position: absolute; left: 0; top: ${chartPadding}px; bottom: 60px; width: 40px; display: flex; flex-direction: column; justify-content: space-between; font-size: 11px; color: var(--muted);">
                  ${[maxValue, Math.ceil(maxValue * 0.75), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.25), 0].map(val => `
                    <div style="text-align: right; padding-right: 8px;">${val}</div>
                  `).join('')}
                </div>
                
                <!-- Chart area -->
                <div style="margin-left: 50px; margin-right: 20px; overflow-x: auto;">
                  <div style="display: flex; align-items: flex-end; gap: 8px; min-width: ${d.weeklyTrendData.length * 80}px; height: ${chartHeight}px; padding-bottom: 80px; position: relative;">
                    <!-- Grid lines -->
                    ${[0, 0.25, 0.5, 0.75, 1].map(ratio => `
                      <div style="position: absolute; left: 0; right: 0; height: 1px; background: #e2e8f0; top: ${chartPadding + (1 - ratio) * usableHeight}px; z-index: 0;"></div>
                    `).join('')}
                    
                    ${d.weeklyTrendData.map((week, index) => {
                      const isLatest = index === d.weeklyTrendData.length - 1;
                      const newCRsHeight = (week.newCRs || 0) / maxValue * usableHeight;
                      const liveCRsHeight = (week.liveCRs || 0) / maxValue * usableHeight;
                      
                      // Format date label better
                      let weekLabel = '';
                      if (week.weekLabel) {
                        weekLabel = week.weekLabel;
                      } else if (week.weekStart) {
                        const date = new Date(week.weekStart);
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        weekLabel = `${monthNames[date.getMonth()]} ${date.getDate()}`;
                        if (week.weekEnd) {
                          const endDate = new Date(week.weekEnd);
                          weekLabel += ` - ${monthNames[endDate.getMonth()]} ${endDate.getDate()}`;
                        }
                      } else {
                        weekLabel = `Week ${index + 1}`;
                      }
                      
                      return `
                        <div style="flex: 0 0 auto; width: 70px; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; z-index: 1;">
                          <div style="display: flex; align-items: flex-end; gap: 3px; width: 100%; height: ${usableHeight}px; position: relative;">
                            <!-- New CRs bar -->
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative;">
                              <div class="chart-bar" style="width: 100%; background: var(--brand); border-radius: 4px 4px 0 0; height: ${newCRsHeight}px; min-height: ${newCRsHeight > 0 ? '2px' : '0'}; position: relative; transition: all 0.2s ease; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" 
                                   title="New CRs: ${week.newCRs || 0}"
                                   onmouseover="this.style.opacity='0.85'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                                   onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                                ${newCRsHeight > 25 ? `<div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: var(--brand); white-space: nowrap;">${week.newCRs || 0}</div>` : ''}
                              </div>
                            </div>
                            <!-- CRs Went Live bar -->
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative;">
                              <div class="chart-bar" style="width: 100%; background: var(--success); border-radius: 4px 4px 0 0; height: ${liveCRsHeight}px; min-height: ${liveCRsHeight > 0 ? '2px' : '0'}; position: relative; transition: all 0.2s ease; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                                   title="CRs Went Live: ${week.liveCRs || 0}"
                                   onmouseover="this.style.opacity='0.85'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                                   onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                                ${liveCRsHeight > 25 ? `<div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: var(--success); white-space: nowrap;">${week.liveCRs || 0}</div>` : ''}
                              </div>
                            </div>
                          </div>
                          <div style="margin-top: 8px; font-size: 11px; color: var(--text); font-weight: ${isLatest ? '600' : '400'}; text-align: center; height: 70px; display: flex; align-items: flex-start; justify-content: center; padding: 0 4px;">
                            <div style="line-height: 1.3; word-break: break-word; hyphens: auto;">${weekLabel}</div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
              
              <!-- Legend -->
              <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin-top: 16px;">
                <div style="display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 20px; height: 20px; background: var(--brand); border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                    <span style="font-size: 13px; color: var(--text); font-weight: 500;">New CRs</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 20px; height: 20px; background: var(--success); border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                    <span style="font-size: 13px; color: var(--text); font-weight: 500;">CRs Went Live</span>
                  </div>
                </div>
                <div style="padding: 12px; background: white; border-radius: 6px; font-size: 12px; color: var(--muted); text-align: center;">
                  <strong>Note:</strong> Week shows Monday-Friday range. "New CRs" = CRs created that week. "CRs Went Live" = CRs that became LIVE that week.
                </div>
              </div>
            `;
          })()}
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
    if (h.startsWith('#new')) {
      const parts = h.split('/');
      const defaultType = parts[1] || 'Project'; // Default to Project if no type specified
      return renderNew(defaultType);
    }
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
