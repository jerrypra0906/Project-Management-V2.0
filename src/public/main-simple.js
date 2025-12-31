const app = document.getElementById('app');
console.log('JavaScript loaded, app element:', app);

// Global function to remove individual filters
window.removeFilter = function(filterType, value) {
  const url = new URL(location);
  const currentValues = url.searchParams.get(filterType);
  
  if (currentValues) {
    const values = currentValues.split(',').map(v => v.trim()).filter(v => v !== value);
    
    if (values.length > 0) {
      url.searchParams.set(filterType, values.join(','));
    } else {
      url.searchParams.delete(filterType);
    }
    
    url.searchParams.delete('page'); // Reset to first page
    location.href = url.toString() + location.hash;
  }
};

async function fetchJSON(url, options) {
  // Avoid cached 304 responses by adding a timestamp and disabling cache
  const cacheBuster = (url.includes('?') ? '&' : '?') + '_ts=' + Date.now();
  const res = await fetch(url + cacheBuster, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', ...(options && options.headers ? options.headers : {}) },
    ...(options || {})
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
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

function setActive(hash) {
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const id = hash.replace('#','') || 'list';
  const el = document.getElementById('nav-' + id);
  if (el) el.classList.add('active');
}

function nameById(arr, id) {
  const m = arr.find(x => x.id === id);
  return m ? m.name : id || '';
}

function initiativeRow(i) {
  const statusClass = i.status ? i.status.toLowerCase().replace(/\s+/g, '-') : '';
  const priorityClass = i.priority ? i.priority.toLowerCase().replace(/\s+/g, '-') : '';
  
  return `<tr class="status-${statusClass}">
    <td class="col-ticket">${i.ticket && i.ticket.trim() ? i.ticket : ''}</td>
    <td class="col-name"><a href="#view/${i.id}">${i.name}</a></td>
    <td class="col-description" title="${i.description || ''}">${truncate(i.description || '', 50)}</td>
    <td class="col-business-impact" title="${i.businessImpact || ''}">${truncate(i.businessImpact || '', 50)}</td>
    <td class="col-priority"><span class="priority-badge priority-${priorityClass}">${i.priority || ''}</span></td>
    <td class="col-status"><span class="status-badge status-${statusClass}">${i.status || ''}</span></td>
    <td class="col-milestone">${i.milestone || ''}</td>
    <td class="col-department">${nameById(LOOKUPS.departments, i.departmentId)}</td>
    <td class="col-start-date">${i.startDate || ''}</td>
    <td class="col-end-date">${i.endDate || ''}</td>
    <td class="col-doc-link">${i.documentationLink || ''}</td>
    <td class="col-remark" title="${i.remark || ''}">${truncate(i.remark || '', 30)}</td>
    <td class="col-actions">
      <a href="#view/${i.id}"><button class="btn-icon" title="View">👁️</button></a>
      <button data-id="${i.id}" class="delete btn-icon" title="Delete">🗑️</button>
    </td>
  </tr>`;
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

function crInitiativeRow(i, crData) {
  const statusClass = i.status ? i.status.toLowerCase().replace(/\s+/g, '-') : '';
  const priorityClass = i.priority ? i.priority.toLowerCase().replace(/\s+/g, '-') : '';
  
  // Extract CR-specific dates
  const crSec1Start = crData?.crSection1Start || '';
  const crSec1End = crData?.crSection1End || '';
  const crSec2Start = crData?.crSection2Start || '';
  const crSec2End = crData?.crSection2End || '';
  const crSec3Start = crData?.crSection3Start || '';
  const crSec3End = crData?.crSection3End || '';
  const devStart = crData?.developmentStart || '';
  const devEnd = crData?.developmentEnd || '';
  const sitStart = crData?.sitStart || '';
  const sitEnd = crData?.sitEnd || '';
  const uatStart = crData?.uatStart || '';
  const uatEnd = crData?.uatEnd || '';
  const liveStart = crData?.liveStart || '';
  const liveEnd = crData?.liveEnd || '';
  
  return `<tr class="status-${statusClass}">
    <td class="col-ticket">${i.ticket && i.ticket.trim() ? i.ticket : ''}</td>
    <td class="col-name"><a href="#view/${i.id}">${i.name}</a></td>
    <td class="col-description" title="${i.description || ''}">${truncate(i.description || '', 50)}</td>
    <td class="col-business-impact" title="${i.businessImpact || ''}">${truncate(i.businessImpact || '', 50)}</td>
    <td class="col-priority"><span class="priority-badge priority-${priorityClass}">${i.priority || ''}</span></td>
    <td class="col-status"><span class="status-badge status-${statusClass}">${i.status || ''}</span></td>
    <td class="col-milestone">${i.milestone || ''}</td>
    <td class="col-department">${nameById(LOOKUPS.departments, i.departmentId)}</td>
    <td class="col-start-date">${i.startDate || ''}</td>
    <td class="col-end-date">${i.endDate || ''}</td>
    <td class="col-date">${crSec1Start}</td>
    <td class="col-date">${crSec1End}</td>
    <td class="col-date">${crSec2Start}</td>
    <td class="col-date">${crSec2End}</td>
    <td class="col-date">${crSec3Start}</td>
    <td class="col-date">${crSec3End}</td>
    <td class="col-date">${devStart}</td>
    <td class="col-date">${devEnd}</td>
    <td class="col-date">${sitStart}</td>
    <td class="col-date">${sitEnd}</td>
    <td class="col-date">${uatStart}</td>
    <td class="col-date">${uatEnd}</td>
    <td class="col-date">${liveStart}</td>
    <td class="col-date">${liveEnd}</td>
    <td class="col-doc-link">${i.documentationLink || ''}</td>
    <td class="col-remark" title="${i.remark || ''}">${truncate(i.remark || '', 30)}</td>
    <td class="col-actions">
      <a href="#view/${i.id}"><button class="btn-icon" title="View">👁️</button></a>
      <button data-id="${i.id}" class="delete btn-icon" title="Delete">🗑️</button>
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
  const active = urlParams.get('active') || '';
  
  // Parse multi-value filters (comma-separated)
  const parseFilterValues = (param) => {
    const value = urlParams.get(param);
    return value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
  };
  
  const filter = {
    departmentId: parseFilterValues('departmentId'),
    priority: parseFilterValues('priority'),
    status: parseFilterValues('status'),
    milestone: parseFilterValues('milestone')
  };
  const sortParam = urlParams.get('sort') || '';
  
  console.log('renderList - URL params:', { q, active, filter, sortParam });
  console.log('renderList - location.search:', location.search);
  
  let data;
  try {
    // Only fetch Project type initiatives with multi-value filters
    const projectQs = new URLSearchParams();
    projectQs.set('type', 'Project');
    if (q) projectQs.set('q', q);
    if (active) projectQs.set('active', active);
    if (filter.departmentId.length) projectQs.set('departmentId', filter.departmentId.join(','));
    if (filter.priority.length) projectQs.set('priority', filter.priority.join(','));
    if (filter.status.length) projectQs.set('status', filter.status.join(','));
    if (filter.milestone.length) projectQs.set('milestone', filter.milestone.join(','));
    
    console.log('renderList - API URL:', '/api/initiatives?' + projectQs.toString());
    data = await fetchJSON('/api/initiatives?' + projectQs.toString());
  } catch (e) {
    console.error('Failed to fetch initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load initiatives: ${e.message}</div>`;
    return;
  }
  
  console.log('Data fetched, count:', data.length);
  
  // Fetch all projects for milestone counting (without filters)
  let allProjects;
  try {
    allProjects = await fetchJSON('/api/initiatives?type=Project');
  } catch (e) {
    console.error('Failed to fetch all projects for milestone counting:', e);
    allProjects = [];
  }
  
  // Count projects by milestone
  const milestoneMap = {
    'Preparation': 'Pre-grooming',
    'Business Requirements': 'Grooming',
    'Tech Assessment': 'Tech Assessment',
    'Planning': 'Planning',
    'Development': 'Development',
    'Testing': 'Testing',
    'Live': 'Live'
  };
  
  const milestoneCounts = {};
  const milestoneOrder = ['Preparation', 'Business Requirements', 'Tech Assessment', 'Planning', 'Development', 'Testing', 'Live'];
  
  // Initialize counts
  milestoneOrder.forEach(milestone => {
    milestoneCounts[milestone] = 0;
  });
  
  // Count projects by milestone (case-insensitive matching)
  allProjects.forEach(project => {
    if (project.milestone && project.milestone.trim() !== '') {
      const milestoneValue = project.milestone.trim();
      // Find matching milestone from our map (case-insensitive)
      const mappedMilestone = Object.keys(milestoneMap).find(
        key => milestoneMap[key].toLowerCase() === milestoneValue.toLowerCase()
      );
      if (mappedMilestone) {
        milestoneCounts[mappedMilestone] = (milestoneCounts[mappedMilestone] || 0) + 1;
      }
    }
  });
  
  // Generate milestone summary HTML
  const generateMilestoneSummary = () => {
    return `
      <div class="milestone-summary">
        <div class="milestone-summary-header">
          <h3>Project Milestones</h3>
        </div>
        <div class="milestone-summary-grid">
          ${milestoneOrder.map(milestone => {
            const count = milestoneCounts[milestone] || 0;
            const mappedValue = milestoneMap[milestone];
            const isClickable = count > 0;
            
            return `
              <div class="milestone-card ${isClickable ? 'clickable' : ''}" 
                   ${isClickable ? `onclick="location.href='?milestone=${encodeURIComponent(mappedValue)}#list'"` : ''}
                   style="cursor: ${isClickable ? 'pointer' : 'default'}">
                <div class="milestone-name">${milestone}</div>
                <div class="milestone-count">${count}</div>
                <div class="milestone-label">project${count !== 1 ? 's' : ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };
  
  // Apply client-side sorting
  if (sortParam) {
    const [sortKey, sortDir] = sortParam.split(':');
    data.sort((a, b) => {
      let aVal = a[sortKey] || '';
      let bVal = b[sortKey] || '';
      
      // Handle department name sorting
      if (sortKey === 'departmentId') {
        aVal = nameById(LOOKUPS.departments, aVal);
        bVal = nameById(LOOKUPS.departments, bVal);
      }
      
      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      // Numeric/date comparison
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });
  }
  
  // Helper to create custom checkbox dropdown for Project List
  const createCheckboxDropdown = (id, label, options, selectedValues, valueKey = 'value', labelKey = 'label') => {
    const selectedCount = selectedValues.length;
    const buttonText = selectedCount > 0 
      ? `${label} (${selectedCount})` 
      : `${label}`;
    
    return `
      <div class="filter-group">
        <label>${label}:</label>
        <div class="custom-dropdown" data-filter-id="${id}">
          <button type="button" class="dropdown-toggle ${selectedCount > 0 ? 'has-selection' : ''}" id="${id}-toggle">
            ${buttonText}
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" id="${id}-menu">
            <div class="dropdown-header">
              <button type="button" class="select-all-btn" data-target="${id}">Select All</button>
              <button type="button" class="deselect-all-btn" data-target="${id}">Clear</button>
            </div>
            <div class="dropdown-options">
              ${options.map(opt => {
                const value = typeof opt === 'object' ? opt[valueKey] : opt;
                const label = typeof opt === 'object' ? opt[labelKey] : opt;
                const isChecked = selectedValues.includes(value);
                return `
                  <label class="dropdown-option">
                    <input type="checkbox" 
                           name="${id}" 
                           value="${value}" 
                           ${isChecked ? 'checked' : ''}>
                    <span class="checkbox-custom"></span>
                    <span class="option-label">${label}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };
  
  // Helper to generate active filter badges for Project List
  const generateFilterBadges = () => {
    const badges = [];
    
    if (filter.departmentId.length > 0) {
      filter.departmentId.forEach(deptId => {
        const deptName = nameById(LOOKUPS.departments, deptId);
        badges.push(`<span class="filter-badge" data-filter="departmentId" data-value="${deptId}">
          Department: ${deptName} <button class="badge-remove" onclick="removeFilter('departmentId', '${deptId}')">×</button>
        </span>`);
      });
    }
    
    if (filter.priority.length > 0) {
      filter.priority.forEach(p => {
        badges.push(`<span class="filter-badge" data-filter="priority" data-value="${p}">
          Priority: ${p} <button class="badge-remove" onclick="removeFilter('priority', '${p}')">×</button>
        </span>`);
      });
    }
    
    if (filter.status.length > 0) {
      filter.status.forEach(s => {
        badges.push(`<span class="filter-badge" data-filter="status" data-value="${s}">
          Status: ${s} <button class="badge-remove" onclick="removeFilter('status', '${s}')">×</button>
        </span>`);
      });
    }
    
    if (filter.milestone.length > 0) {
      filter.milestone.forEach(m => {
        badges.push(`<span class="filter-badge" data-filter="milestone" data-value="${m}">
          Milestone: ${m} <button class="badge-remove" onclick="removeFilter('milestone', '${m}')">×</button>
        </span>`);
      });
    }
    
    if (badges.length === 0) {
      return '<div class="no-filters">No active filters. Select filters above and click "Apply Filters".</div>';
    }
    
    return `<div class="active-filters-label">Active Filters:</div>${badges.join('')}`;
  };
  
  // Enhanced table view with checkbox dropdowns
  app.innerHTML = `
    <div class="toolbar">
      <div class="search-group">
        <input id="search" placeholder="🔍 Search by name or description..." value="${q}">
        <button id="doSearch" class="btn-search">Search</button>
      </div>
      <div class="filters-row">
        ${createCheckboxDropdown('fDepartment', 'Department', 
          LOOKUPS.departments.map(d => ({ value: d.id, label: d.name })), 
          filter.departmentId, 'value', 'label')}
        ${createCheckboxDropdown('fPriority', 'Priority', 
          ['P0', 'P1', 'P2'], 
          filter.priority)}
        ${createCheckboxDropdown('fStatus', 'Status', 
          ['NOT STARTED', 'ON HOLD', 'ON TRACK', 'AT RISK', 'DELAYED', 'LIVE', 'CANCELLED'], 
          filter.status)}
        ${createCheckboxDropdown('fMilestone', 'Milestone', 
          ['Pre-grooming', 'Grooming', 'Tech Assessment', 'Planning', 'Development', 'Testing', 'Live'], 
          filter.milestone)}
      </div>
      <div class="action-buttons">
        <button id="applyFilters" class="btn-primary">
          <span class="btn-icon">✓</span> Apply Filters
        </button>
        <button id="clearFilters" class="btn-secondary">
          <span class="btn-icon">✕</span> Clear All
        </button>
      </div>
    </div>
    <div class="filter-help">
      <span class="help-icon">💡 <strong>Quick Tip:</strong> Click filter dropdowns and check boxes to select multiple values, then click "Apply Filters"</span>
    </div>
    <div class="active-filters-container">
      ${generateFilterBadges()}
    </div>
    ${generateMilestoneSummary()}
    <div class="table-wrapper">
      <table class="modern-table">
        <thead>
          <tr>
            <th class="sortable col-ticket" data-key="ticket">Ticket <span class="sort-indicator"></span></th>
            <th class="sortable col-name" data-key="name">Initiative Name <span class="sort-indicator"></span></th>
            <th class="sortable col-description" data-key="description">Description <span class="sort-indicator"></span></th>
            <th class="sortable col-business-impact" data-key="businessImpact">Business Impact <span class="sort-indicator"></span></th>
            <th class="sortable col-priority" data-key="priority">Priority <span class="sort-indicator"></span></th>
            <th class="sortable col-status" data-key="status">Status <span class="sort-indicator"></span></th>
            <th class="sortable col-milestone" data-key="milestone">Milestone <span class="sort-indicator"></span></th>
            <th class="sortable col-department" data-key="departmentId">Department <span class="sort-indicator"></span></th>
            <th class="sortable col-start-date" data-key="startDate">Start Date <span class="sort-indicator"></span></th>
            <th class="sortable col-end-date" data-key="endDate">End Date <span class="sort-indicator"></span></th>
            <th class="col-doc-link">Project Doc Link</th>
            <th class="sortable col-remark" data-key="remark">Remark <span class="sort-indicator"></span></th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(i => initiativeRow(i)).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // Add event handlers for Project List
  document.getElementById('doSearch').onclick = () => {
    const v = document.getElementById('search').value;
    location.href = `?q=${encodeURIComponent(v)}#list`;
  };
  
  document.getElementById('search').onkeypress = (e) => {
    if (e.key === 'Enter') {
      const v = document.getElementById('search').value;
      location.href = `?q=${encodeURIComponent(v)}#list`;
    }
  };
  
  // Helper function to get checked values from checkbox dropdown
  const getCheckedValues = (filterId) => {
    const checkboxes = document.querySelectorAll(`input[name="${filterId}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
  };
  
  // Update dropdown toggle button text with count
  const updateDropdownToggle = (filterId) => {
    const checkedCount = document.querySelectorAll(`input[name="${filterId}"]:checked`).length;
    const toggle = document.getElementById(`${filterId}-toggle`);
    const label = toggle.textContent.split('(')[0].trim().replace('▼', '').trim();
    
    if (checkedCount > 0) {
      toggle.innerHTML = `${label} (${checkedCount}) <span class="dropdown-arrow">▼</span>`;
      toggle.classList.add('has-selection');
    } else {
      toggle.innerHTML = `${label} <span class="dropdown-arrow">▼</span>`;
      toggle.classList.remove('has-selection');
    }
  };
  
  // Custom dropdown functionality
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = toggle.closest('.custom-dropdown');
      const menu = dropdown.querySelector('.dropdown-menu');
      const isOpen = menu.classList.contains('show');
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown-menu.show').forEach(m => {
        m.classList.remove('show');
      });
      
      // Toggle current dropdown
      if (!isOpen) {
        menu.classList.add('show');
        toggle.classList.add('active');
      } else {
        menu.classList.remove('show');
        toggle.classList.remove('active');
      }
    });
  });
  
  // Handle checkbox changes
  document.querySelectorAll('.dropdown-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const filterId = e.target.name;
      updateDropdownToggle(filterId);
    });
  });
  
  // Select All button
  document.querySelectorAll('.select-all-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filterId = btn.getAttribute('data-target');
      document.querySelectorAll(`input[name="${filterId}"]`).forEach(cb => {
        cb.checked = true;
      });
      updateDropdownToggle(filterId);
    });
  });
  
  // Deselect All button
  document.querySelectorAll('.deselect-all-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filterId = btn.getAttribute('data-target');
      document.querySelectorAll(`input[name="${filterId}"]`).forEach(cb => {
        cb.checked = false;
      });
      updateDropdownToggle(filterId);
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
        const dropdown = menu.closest('.custom-dropdown');
        const toggle = dropdown.querySelector('.dropdown-toggle');
        toggle.classList.remove('active');
      });
    }
  });
  
  // Prevent dropdown from closing when clicking inside
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  // Apply Filters button handler
  document.getElementById('applyFilters').onclick = () => {
    const url = new URL(location);
    const searchValue = document.getElementById('search').value;
    
    // Clear existing filter params
    url.searchParams.delete('departmentId');
    url.searchParams.delete('priority');
    url.searchParams.delete('status');
    url.searchParams.delete('milestone');
    
    // Set search query
    if (searchValue) url.searchParams.set('q', searchValue);
    else url.searchParams.delete('q');
    
    // Get checked values from checkbox dropdowns
    const departments = getCheckedValues('fDepartment');
    const priorities = getCheckedValues('fPriority');
    const statuses = getCheckedValues('fStatus');
    const milestones = getCheckedValues('fMilestone');
    
    // Set multi-value parameters as comma-separated
    if (departments.length > 0) url.searchParams.set('departmentId', departments.join(','));
    if (priorities.length > 0) url.searchParams.set('priority', priorities.join(','));
    if (statuses.length > 0) url.searchParams.set('status', statuses.join(','));
    if (milestones.length > 0) url.searchParams.set('milestone', milestones.join(','));
    
    location.href = url.toString() + '#list';
  };
  
  // Clear All Filters button handler
  document.getElementById('clearFilters').onclick = () => {
    const url = new URL(location);
    url.searchParams.delete('q');
    url.searchParams.delete('departmentId');
    url.searchParams.delete('priority');
    url.searchParams.delete('status');
    url.searchParams.delete('milestone');
    location.href = url.toString() + '#list';
  };
  
  // Add sorting functionality
  document.querySelectorAll('.sortable').forEach(th => {
    th.onclick = () => {
      const key = th.getAttribute('data-key');
      const url = new URL(location);
      const currentSort = url.searchParams.get('sort');
      const [currentKey, currentDir] = currentSort ? currentSort.split(':') : ['', ''];
      
      let newDir = 'asc';
      if (currentKey === key && currentDir === 'asc') {
        newDir = 'desc';
      }
      
      url.searchParams.set('sort', `${key}:${newDir}`);
      location.href = url.toString() + '#list';
    };
  });
  
  // Update sort indicators
  if (sortParam) {
    const [sortKey, sortDir] = sortParam.split(':');
    document.querySelectorAll('.sortable').forEach(th => {
      const indicator = th.querySelector('.sort-indicator');
      if (th.getAttribute('data-key') === sortKey) {
        indicator.textContent = sortDir === 'asc' ? '↑' : '↓';
        th.classList.add('sorted');
      }
    });
  }
}

async function renderCRList() {
  console.log('renderCRList called');
  setActive('#crlist');
  
  try {
    await ensureLookups();
    console.log('Lookups loaded successfully for CR List');
  } catch (error) {
    console.error('Error loading lookups for CR List:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  
  const urlParams = new URLSearchParams(location.search);
  const q = urlParams.get('q') || '';
  
  // Parse multi-value filters (comma-separated)
  const parseFilterValues = (param) => {
    const value = urlParams.get(param);
    return value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
  };
  
  const filter = {
    departmentId: parseFilterValues('departmentId'),
    priority: parseFilterValues('priority'),
    status: parseFilterValues('status'),
    milestone: parseFilterValues('milestone')
  };
  const sortParam = urlParams.get('sort') || '';
  
  // Build API query string with comma-separated values
  const apiQs = new URLSearchParams();
  if (q) apiQs.set('q', q);
  if (filter.departmentId.length) apiQs.set('departmentId', filter.departmentId.join(','));
  if (filter.priority.length) apiQs.set('priority', filter.priority.join(','));
  if (filter.status.length) apiQs.set('status', filter.status.join(','));
  if (filter.milestone.length) apiQs.set('milestone', filter.milestone.join(','));
  
  let data;
  try {
    // Fetch CR initiatives with proper query parameters
    const crQs = new URLSearchParams();
    crQs.set('type', 'CR');
    if (q) crQs.set('q', q);
    if (filter.departmentId.length) crQs.set('departmentId', filter.departmentId.join(','));
    if (filter.priority.length) crQs.set('priority', filter.priority.join(','));
    if (filter.status.length) crQs.set('status', filter.status.join(','));
    if (filter.milestone.length) crQs.set('milestone', filter.milestone.join(','));
    data = await fetchJSON('/api/initiatives?' + crQs.toString());
  } catch (e) {
    console.error('Failed to fetch CR initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load CR initiatives: ${e.message}</div>`;
    return;
  }
  
  console.log('CR Data fetched, count:', data.length);
  
  // Apply client-side sorting
  if (sortParam) {
    const [sortKey, sortDir] = sortParam.split(':');
    data.sort((a, b) => {
      let aVal = a[sortKey] || '';
      let bVal = b[sortKey] || '';
      
      // Handle department name sorting
      if (sortKey === 'departmentId') {
        aVal = nameById(LOOKUPS.departments, aVal);
        bVal = nameById(LOOKUPS.departments, bVal);
      }
      
      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      // Numeric/date comparison
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });
  }
  
  // Pagination
  const currentPage = parseInt(urlParams.get('page')) || 1;
  const itemsPerPage = 15;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  
  // Generate pagination controls
  function generatePagination() {
    if (totalPages <= 1) return '';
    
    let paginationHtml = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
      const prevUrl = new URL(location);
      prevUrl.searchParams.set('page', currentPage - 1);
      paginationHtml += `<a href="${prevUrl.toString()}" class="page-btn">← Previous</a>`;
    } else {
      paginationHtml += `<span class="page-btn disabled">← Previous</span>`;
    }
    
    // Page numbers
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      const firstUrl = new URL(location);
      firstUrl.searchParams.set('page', 1);
      paginationHtml += `<a href="${firstUrl.toString()}" class="page-btn">1</a>`;
      if (startPage > 2) paginationHtml += `<span class="page-ellipsis">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageUrl = new URL(location);
      pageUrl.searchParams.set('page', i);
      if (i === currentPage) {
        paginationHtml += `<span class="page-btn active">${i}</span>`;
      } else {
        paginationHtml += `<a href="${pageUrl.toString()}" class="page-btn">${i}</a>`;
      }
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) paginationHtml += `<span class="page-ellipsis">...</span>`;
      const lastUrl = new URL(location);
      lastUrl.searchParams.set('page', totalPages);
      paginationHtml += `<a href="${lastUrl.toString()}" class="page-btn">${totalPages}</a>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
      const nextUrl = new URL(location);
      nextUrl.searchParams.set('page', currentPage + 1);
      paginationHtml += `<a href="${nextUrl.toString()}" class="page-btn">Next →</a>`;
    } else {
      paginationHtml += `<span class="page-btn disabled">Next →</span>`;
    }
    
    paginationHtml += '</div>';
    return paginationHtml;
  }
  
  // Helper to generate active filter badges
  const generateFilterBadges = () => {
    const badges = [];
    
    if (filter.departmentId.length > 0) {
      filter.departmentId.forEach(deptId => {
        const deptName = nameById(LOOKUPS.departments, deptId);
        badges.push(`<span class="filter-badge" data-filter="departmentId" data-value="${deptId}">
          Department: ${deptName} <button class="badge-remove" onclick="removeFilter('departmentId', '${deptId}')">×</button>
        </span>`);
      });
    }
    
    if (filter.priority.length > 0) {
      filter.priority.forEach(p => {
        badges.push(`<span class="filter-badge" data-filter="priority" data-value="${p}">
          Priority: ${p} <button class="badge-remove" onclick="removeFilter('priority', '${p}')">×</button>
        </span>`);
      });
    }
    
    if (filter.status.length > 0) {
      filter.status.forEach(s => {
        badges.push(`<span class="filter-badge" data-filter="status" data-value="${s}">
          Status: ${s} <button class="badge-remove" onclick="removeFilter('status', '${s}')">×</button>
        </span>`);
      });
    }
    
    if (filter.milestone.length > 0) {
      filter.milestone.forEach(m => {
        badges.push(`<span class="filter-badge" data-filter="milestone" data-value="${m}">
          Milestone: ${m} <button class="badge-remove" onclick="removeFilter('milestone', '${m}')">×</button>
        </span>`);
      });
    }
    
    if (badges.length === 0) {
      return '<div class="no-filters">No active filters. Select filters above and click "Apply Filters".</div>';
    }
    
    return `<div class="active-filters-label">Active Filters:</div>${badges.join('')}`;
  };
  
  // Helper to create custom checkbox dropdown
  const createCheckboxDropdown = (id, label, options, selectedValues, valueKey = 'value', labelKey = 'label') => {
    const selectedCount = selectedValues.length;
    const buttonText = selectedCount > 0 
      ? `${label} (${selectedCount})` 
      : `${label}`;
    
    return `
      <div class="filter-group">
        <label>${label}:</label>
        <div class="custom-dropdown" data-filter-id="${id}">
          <button type="button" class="dropdown-toggle ${selectedCount > 0 ? 'has-selection' : ''}" id="${id}-toggle">
            ${buttonText}
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" id="${id}-menu">
            <div class="dropdown-header">
              <button type="button" class="select-all-btn" data-target="${id}">Select All</button>
              <button type="button" class="deselect-all-btn" data-target="${id}">Clear</button>
            </div>
            <div class="dropdown-options">
              ${options.map(opt => {
                const value = typeof opt === 'object' ? opt[valueKey] : opt;
                const label = typeof opt === 'object' ? opt[labelKey] : opt;
                const isChecked = selectedValues.includes(value);
                return `
                  <label class="dropdown-option">
                    <input type="checkbox" 
                           name="${id}" 
                           value="${value}" 
                           ${isChecked ? 'checked' : ''}>
                    <span class="checkbox-custom"></span>
                    <span class="option-label">${label}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };
  
  // Enhanced CR table view with all columns
  app.innerHTML = `
    <div class="toolbar">
      <div class="search-group">
        <input id="search" placeholder="🔍 Search by name or description..." value="${q}">
        <button id="doSearch" class="btn-search">Search</button>
      </div>
      <div class="filters-row">
        ${createCheckboxDropdown('fDepartment', 'Department', 
          LOOKUPS.departments.map(d => ({ value: d.id, label: d.name })), 
          filter.departmentId, 'value', 'label')}
        ${createCheckboxDropdown('fPriority', 'Priority', 
          ['P0', 'P1', 'P2'], 
          filter.priority)}
        ${createCheckboxDropdown('fStatus', 'Status', 
          ['NOT STARTED', 'ON HOLD', 'ON TRACK', 'AT RISK', 'DELAYED', 'LIVE', 'CANCELLED'], 
          filter.status)}
        ${createCheckboxDropdown('fMilestone', 'Milestone', 
          ['Pre-grooming', 'Grooming', 'Tech Assessment', 'Planning', 'Development', 'Testing', 'Live'], 
          filter.milestone)}
      </div>
      <div class="action-buttons">
        <button id="applyFilters" class="btn-primary">
          <span class="btn-icon">✓</span> Apply Filters
        </button>
        <button id="clearFilters" class="btn-secondary">
          <span class="btn-icon">✕</span> Clear All
        </button>
      </div>
    </div>
    <div class="filter-help">
      <span class="help-icon">💡 <strong>Quick Tip:</strong> Click filter dropdowns and check boxes to select multiple values, then click "Apply Filters"</span>
    </div>
    <div class="active-filters-container">
      ${generateFilterBadges()}
    </div>
    <div class="results-info">
      Showing ${startIndex + 1}-${Math.min(endIndex, data.length)} of ${data.length} CRs
    </div>
    <div class="table-wrapper">
      <table class="modern-table">
        <thead>
          <tr>
            <th class="sortable col-ticket" data-key="ticket">Ticket <span class="sort-indicator"></span></th>
            <th class="sortable col-name" data-key="name">Initiative Name <span class="sort-indicator"></span></th>
            <th class="sortable col-description" data-key="description">Description <span class="sort-indicator"></span></th>
            <th class="sortable col-business-impact" data-key="businessImpact">Business Impact <span class="sort-indicator"></span></th>
            <th class="sortable col-priority" data-key="priority">Priority <span class="sort-indicator"></span></th>
            <th class="sortable col-status" data-key="status">Status <span class="sort-indicator"></span></th>
            <th class="sortable col-milestone" data-key="milestone">Milestone <span class="sort-indicator"></span></th>
            <th class="sortable col-department" data-key="departmentId">Department <span class="sort-indicator"></span></th>
            <th class="sortable col-start-date" data-key="startDate">Start Date <span class="sort-indicator"></span></th>
            <th class="sortable col-end-date" data-key="endDate">End Date <span class="sort-indicator"></span></th>
            <th class="col-date">CR Sec 1 Start</th>
            <th class="col-date">CR Sec 1 End</th>
            <th class="col-date">CR Sec 2 Start</th>
            <th class="col-date">CR Sec 2 End</th>
            <th class="col-date">CR Sec 3 Start</th>
            <th class="col-date">CR Sec 3 End</th>
            <th class="col-date">Dev Start</th>
            <th class="col-date">Dev End</th>
            <th class="col-date">SIT Start</th>
            <th class="col-date">SIT End</th>
            <th class="col-date">UAT Start</th>
            <th class="col-date">UAT End</th>
            <th class="col-date">Live Start</th>
            <th class="col-date">Live End</th>
            <th class="col-doc-link">Project Doc Link</th>
            <th class="sortable col-remark" data-key="remark">Remark <span class="sort-indicator"></span></th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedData.map(i => crInitiativeRow(i, i.cr)).join('')}
        </tbody>
      </table>
    </div>
    ${generatePagination()}
  `;
  
  // Add event handlers for CR List
  document.getElementById('doSearch').onclick = () => {
    const v = document.getElementById('search').value;
    location.href = `?q=${encodeURIComponent(v)}#crlist`;
  };
  
  document.getElementById('search').onkeypress = (e) => {
    if (e.key === 'Enter') {
      const v = document.getElementById('search').value;
      location.href = `?q=${encodeURIComponent(v)}#crlist`;
    }
  };
  
  // Helper function to get checked values from checkbox dropdown
  const getCheckedValues = (filterId) => {
    const checkboxes = document.querySelectorAll(`input[name="${filterId}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
  };
  
  // Update dropdown toggle button text with count
  const updateDropdownToggle = (filterId) => {
    const checkedCount = document.querySelectorAll(`input[name="${filterId}"]:checked`).length;
    const toggle = document.getElementById(`${filterId}-toggle`);
    const label = toggle.textContent.split('(')[0].trim().replace('▼', '').trim();
    
    if (checkedCount > 0) {
      toggle.innerHTML = `${label} (${checkedCount}) <span class="dropdown-arrow">▼</span>`;
      toggle.classList.add('has-selection');
    } else {
      toggle.innerHTML = `${label} <span class="dropdown-arrow">▼</span>`;
      toggle.classList.remove('has-selection');
    }
  };
  
  // Custom dropdown functionality
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = toggle.closest('.custom-dropdown');
      const menu = dropdown.querySelector('.dropdown-menu');
      const isOpen = menu.classList.contains('show');
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown-menu.show').forEach(m => {
        m.classList.remove('show');
      });
      
      // Toggle current dropdown
      if (!isOpen) {
        menu.classList.add('show');
        toggle.classList.add('active');
      } else {
        menu.classList.remove('show');
        toggle.classList.remove('active');
      }
    });
  });
  
  // Handle checkbox changes
  document.querySelectorAll('.dropdown-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const filterId = e.target.name;
      updateDropdownToggle(filterId);
    });
  });
  
  // Select All button
  document.querySelectorAll('.select-all-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filterId = btn.getAttribute('data-target');
      document.querySelectorAll(`input[name="${filterId}"]`).forEach(cb => {
        cb.checked = true;
      });
      updateDropdownToggle(filterId);
    });
  });
  
  // Deselect All button
  document.querySelectorAll('.deselect-all-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filterId = btn.getAttribute('data-target');
      document.querySelectorAll(`input[name="${filterId}"]`).forEach(cb => {
        cb.checked = false;
      });
      updateDropdownToggle(filterId);
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
        const dropdown = menu.closest('.custom-dropdown');
        const toggle = dropdown.querySelector('.dropdown-toggle');
        toggle.classList.remove('active');
      });
    }
  });
  
  // Prevent dropdown from closing when clicking inside
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  // Apply Filters button handler
  document.getElementById('applyFilters').onclick = () => {
    const url = new URL(location);
    const searchValue = document.getElementById('search').value;
    
    // Clear existing filter params
    url.searchParams.delete('departmentId');
    url.searchParams.delete('priority');
    url.searchParams.delete('status');
    url.searchParams.delete('milestone');
    url.searchParams.delete('page'); // Reset to first page
    
    // Set search query
    if (searchValue) url.searchParams.set('q', searchValue);
    else url.searchParams.delete('q');
    
    // Get checked values from checkbox dropdowns
    const departments = getCheckedValues('fDepartment');
    const priorities = getCheckedValues('fPriority');
    const statuses = getCheckedValues('fStatus');
    const milestones = getCheckedValues('fMilestone');
    
    // Set multi-value parameters as comma-separated
    if (departments.length > 0) url.searchParams.set('departmentId', departments.join(','));
    if (priorities.length > 0) url.searchParams.set('priority', priorities.join(','));
    if (statuses.length > 0) url.searchParams.set('status', statuses.join(','));
    if (milestones.length > 0) url.searchParams.set('milestone', milestones.join(','));
    
    location.href = url.toString() + '#crlist';
  };
  
  // Clear All Filters button handler
  document.getElementById('clearFilters').onclick = () => {
    const url = new URL(location);
    url.searchParams.delete('q');
    url.searchParams.delete('departmentId');
    url.searchParams.delete('priority');
    url.searchParams.delete('status');
    url.searchParams.delete('milestone');
    url.searchParams.delete('page');
    location.href = url.toString() + '#crlist';
  };
  
  // Add sorting functionality
  document.querySelectorAll('.sortable').forEach(th => {
    th.onclick = () => {
      const key = th.getAttribute('data-key');
      const url = new URL(location);
      const currentSort = url.searchParams.get('sort');
      const [currentKey, currentDir] = currentSort ? currentSort.split(':') : ['', ''];
      
      let newDir = 'asc';
      if (currentKey === key && currentDir === 'asc') {
        newDir = 'desc';
      }
      
      url.searchParams.set('sort', `${key}:${newDir}`);
      location.href = url.toString() + '#crlist';
    };
  });
  
  // Update sort indicators
  if (sortParam) {
    const [sortKey, sortDir] = sortParam.split(':');
    document.querySelectorAll('.sortable').forEach(th => {
      const indicator = th.querySelector('.sort-indicator');
      if (th.getAttribute('data-key') === sortKey) {
        indicator.textContent = sortDir === 'asc' ? '↑' : '↓';
        th.classList.add('sorted');
      }
    });
  }
  
  // Add delete handlers
  document.querySelectorAll('.delete').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Are you sure you want to delete this CR?')) return;
      try {
        await fetchJSON(`/api/initiatives/${id}`, { method: 'DELETE' });
        location.reload();
      } catch (e) {
        alert('Failed to delete: ' + e.message);
      }
    };
  });
}

// CR Aging Pagination
function initializeCRAgingPagination(dashboardData) {
  const container = document.getElementById('cr-aging-container');
  if (!container) return;
  
  const allCRs = (dashboardData.crAging || [])
    .filter(p => p.status && p.status.toUpperCase() !== 'NOT STARTED')
    .sort((a, b) => (b.daysSinceCreated || 0) - (a.daysSinceCreated || 0));
  
  let currentPage = 1;
  const itemsPerPage = 15;
  const totalPages = Math.ceil(allCRs.length / itemsPerPage);
  
  function renderPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allCRs.slice(startIndex, endIndex);
    
    container.innerHTML = `
      <div class="results-info">Showing ${startIndex + 1}-${Math.min(endIndex, allCRs.length)} of ${allCRs.length} Active CRs</div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>CR Name</th>
              <th>Status</th>
              <th>Milestone</th>
              <th>Department</th>
              <th>Age (Days)</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedData.map(p => `
              <tr class="clickable-row" onclick="location.href='#crview/${p.id}'" style="cursor: pointer;">
                <td>
                  <div class="project-name-cell">
                    <span class="project-name">${p.name || 'Unnamed CR'}</span>
                  </div>
                </td>
                <td><span class="status-badge status-${(p.status || '').toLowerCase().replace(/\s+/g, '-')}">${p.status || 'Unknown'}</span></td>
                <td><span class="milestone-badge">${p.milestone || 'No milestone'}</span></td>
                <td><span class="department-name">${nameById(LOOKUPS.departments, p.departmentId) || 'Unknown'}</span></td>
                <td>
                  <span class="aging-value ${(p.daysSinceCreated || 0) > 180 ? 'aging-critical' : (p.daysSinceCreated || 0) > 90 ? 'aging-warning' : 'aging-normal'}">
                    ${p.daysSinceCreated || 0} days
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
        <div class="pagination">
          <button class="page-btn" id="cr-aging-prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
          <span class="page-info">Page ${currentPage} of ${totalPages}</span>
          <button class="page-btn" id="cr-aging-next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      ` : ''}
    `;
    
    // Add event listeners for pagination buttons
    if (totalPages > 1) {
      const prevBtn = document.getElementById('cr-aging-prev');
      const nextBtn = document.getElementById('cr-aging-next');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage > 1) {
            currentPage--;
            renderPage();
            // Scroll to the top of the table
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            // Scroll to the top of the table
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    }
  }
  
  renderPage();
}

// CR Milestone Durations Pagination
function initializeCRMilestonePagination(dashboardData) {
  const container = document.getElementById('cr-milestone-container');
  if (!container) return;
  
  const allMilestones = dashboardData.milestoneDurations || [];
  
  let currentPage = 1;
  const itemsPerPage = 15;
  const totalPages = Math.ceil(allMilestones.length / itemsPerPage);
  
  function renderPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allMilestones.slice(startIndex, endIndex);
    
    container.innerHTML = `
      <div class="results-info">Showing ${startIndex + 1}-${Math.min(endIndex, allMilestones.length)} of ${allMilestones.length} CRs</div>
      <div class="milestone-table-wrapper">
        <table class="milestone-table">
          <thead>
            <tr>
              <th class="sticky-col">CR Name</th>
              <th>Pre-grooming</th>
              <th>Grooming</th>
              <th>Tech Assessment</th>
              <th>Planning</th>
              <th>Development</th>
              <th>Testing</th>
              <th>Live</th>
            </tr>
          </thead>
          <tbody>
            ${generateMilestoneMatrix(paginatedData, 'crview')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
        <div class="pagination">
          <button class="page-btn" id="cr-milestone-prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
          <span class="page-info">Page ${currentPage} of ${totalPages}</span>
          <button class="page-btn" id="cr-milestone-next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      ` : ''}
    `;
    
    // Add event listeners for pagination buttons
    if (totalPages > 1) {
      const prevBtn = document.getElementById('cr-milestone-prev');
      const nextBtn = document.getElementById('cr-milestone-next');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage > 1) {
            currentPage--;
            renderPage();
            // Scroll to the top of the table
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            // Scroll to the top of the table
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    }
  }
  
  renderPage();
}

function showNewCRsModal(newCRs, weekStart, weekEnd) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 800px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;
  
  modalContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
      <h2 style="margin: 0; color: #1e293b; font-size: 24px;">🆕 New CRs Created This Week</h2>
      <button id="close-modal" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #64748b; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">×</button>
    </div>
    <div style="margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 8px; color: #475569; font-size: 14px;">
      <strong>Week Period:</strong> ${weekStart} to ${weekEnd}
    </div>
    ${newCRs.length > 0 ? `
      <div style="margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">CR Name</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Created Date</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${newCRs.map((cr, index) => `
              <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background: #fafafa;' : ''} transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${index % 2 === 0 ? '#fafafa' : 'white'}'">
                <td style="padding: 12px; color: #1e293b;">${cr.name}</td>
                <td style="padding: 12px; color: #64748b; font-size: 14px;">${cr.createdAt ? new Date(cr.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                <td style="padding: 12px; text-align: center;">
                  <a href="#view/${cr.id}" style="display: inline-block; padding: 6px 16px; background: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">View</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
        <p style="font-size: 18px; margin: 0;">No new CRs created this week</p>
      </div>
    `}
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Close modal handlers
  const closeModal = () => {
    document.body.removeChild(modalOverlay);
  };
  
  document.getElementById('close-modal').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function createWeeklyTrendChart(weeklyData) {
  if (!weeklyData || weeklyData.length === 0) {
    return '<div class="no-data">No weekly trend data available</div>';
  }
  
  // Find the maximum value for scaling
  const maxValue = Math.max(...weeklyData.map(week => 
    Math.max(week.totalCRs, week.liveCRs, week.createdCRs, week.notLiveCRs)
  ));
  
  if (maxValue === 0) {
    return '<div class="no-data">No data available for trend analysis</div>';
  }
  
  const chartHeight = 250;
  const chartWidth = Math.max(600, weeklyData.length * 150);
  
  // Generate SVG line chart
  const svgContent = generateLineChartSVG(weeklyData, chartWidth, chartHeight, maxValue);
  
  return `
    <div class="trend-chart">
      <div class="trend-legend">
        <div class="legend-item">
          <div class="legend-line" style="background: linear-gradient(90deg, #3b82f6, #3b82f6);"></div>
          <span>Total CRs</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background: linear-gradient(90deg, #10b981, #10b981);"></div>
          <span>Live CRs</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background: linear-gradient(90deg, #f59e0b, #f59e0b);"></div>
          <span>Created This Week</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background: linear-gradient(90deg, #ef4444, #ef4444);"></div>
          <span>Not Yet Live</span>
        </div>
      </div>
      <div class="trend-chart-content">
        <div class="line-chart-container" style="width: 100%; overflow-x: auto;">
          <svg width="${chartWidth}" height="${chartHeight}" class="line-chart-svg">
            ${svgContent}
          </svg>
        </div>
        <div class="chart-data-table">
          ${weeklyData.map((week, index) => {
            const weekLabel = formatWeekLabel(week.weekStart, week.weekEnd);
            const trendDirection = getTrendDirection(weeklyData, index);
            
            return `
              <div class="data-row">
                <div class="week-info">
                  <div class="week-label">${weekLabel}</div>
                  <div class="trend-indicator ${trendDirection.class}">${trendDirection.text}</div>
                </div>
                <div class="week-values">
                  <div class="value-item">
                    <span class="value-label">Total:</span>
                    <span class="value-number">${week.totalCRs}</span>
                  </div>
                  <div class="value-item">
                    <span class="value-label">Live:</span>
                    <span class="value-number">${week.liveCRs}</span>
                  </div>
                  <div class="value-item">
                    <span class="value-label">New:</span>
                    <span class="value-number">${week.createdCRs}</span>
                  </div>
                  <div class="value-item">
                    <span class="value-label">Pending:</span>
                    <span class="value-number">${week.notLiveCRs}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function generateLineChartSVG(weeklyData, width, height, maxValue) {
  const padding = { top: 20, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate positions for each data point
  const stepX = chartWidth / (weeklyData.length - 1);
  const points = {
    totalCRs: [],
    liveCRs: [],
    createdCRs: [],
    notLiveCRs: []
  };
  
  weeklyData.forEach((week, index) => {
    const x = padding.left + (index * stepX);
    points.totalCRs.push({ x, y: padding.top + chartHeight - (week.totalCRs / maxValue) * chartHeight });
    points.liveCRs.push({ x, y: padding.top + chartHeight - (week.liveCRs / maxValue) * chartHeight });
    points.createdCRs.push({ x, y: padding.top + chartHeight - (week.createdCRs / maxValue) * chartHeight });
    points.notLiveCRs.push({ x, y: padding.top + chartHeight - (week.notLiveCRs / maxValue) * chartHeight });
  });
  
  // Generate path strings for each line
  const paths = {
    totalCRs: generatePathString(points.totalCRs),
    liveCRs: generatePathString(points.liveCRs),
    createdCRs: generatePathString(points.createdCRs),
    notLiveCRs: generatePathString(points.notLiveCRs)
  };
  
  // Generate grid lines and labels
  const gridLines = generateGridLines(maxValue, padding, chartWidth, chartHeight);
  const axisLabels = generateAxisLabels(weeklyData, maxValue, padding, chartWidth, chartHeight);
  
  return `
    <!-- Grid lines -->
    ${gridLines}
    
    <!-- Axis labels -->
    ${axisLabels}
    
    <!-- Data lines -->
    <path d="${paths.totalCRs}" stroke="#3b82f6" stroke-width="3" fill="none" class="trend-line total" />
    <path d="${paths.liveCRs}" stroke="#10b981" stroke-width="3" fill="none" class="trend-line live" />
    <path d="${paths.createdCRs}" stroke="#f59e0b" stroke-width="3" fill="none" class="trend-line created" stroke-dasharray="5,5" />
    <path d="${paths.notLiveCRs}" stroke="#ef4444" stroke-width="3" fill="none" class="trend-line not-live" />
    
    <!-- Data points -->
    ${points.totalCRs.map((point, index) => 
      `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#3b82f6" class="data-point total" data-value="${weeklyData[index].totalCRs}" data-week="${formatWeekLabel(weeklyData[index].weekStart, weeklyData[index].weekEnd)}" />`
    ).join('')}
    
    ${points.liveCRs.map((point, index) => 
      `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#10b981" class="data-point live" data-value="${weeklyData[index].liveCRs}" data-week="${formatWeekLabel(weeklyData[index].weekStart, weeklyData[index].weekEnd)}" />`
    ).join('')}
    
    ${points.createdCRs.map((point, index) => 
      `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#f59e0b" class="data-point created" data-value="${weeklyData[index].createdCRs}" data-week="${formatWeekLabel(weeklyData[index].weekStart, weeklyData[index].weekEnd)}" />`
    ).join('')}
    
    ${points.notLiveCRs.map((point, index) => 
      `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#ef4444" class="data-point not-live" data-value="${weeklyData[index].notLiveCRs}" data-week="${formatWeekLabel(weeklyData[index].weekStart, weeklyData[index].weekEnd)}" />`
    ).join('')}
  `;
}

function generatePathString(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

function generateGridLines(maxValue, padding, chartWidth, chartHeight) {
  const lines = [];
  const numLines = 5;
  
  for (let i = 0; i <= numLines; i++) {
    const value = Math.round((maxValue / numLines) * i);
    const y = padding.top + chartHeight - (i / numLines) * chartHeight;
    
    lines.push(`
      <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" 
            stroke="#e2e8f0" stroke-width="1" />
      <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" 
            font-size="12" fill="#64748b">${value}</text>
    `);
  }
  
  return lines.join('');
}

function generateAxisLabels(weeklyData, maxValue, padding, chartWidth, chartHeight) {
  const stepX = chartWidth / (weeklyData.length - 1);
  
  return weeklyData.map((week, index) => {
    const x = padding.left + (index * stepX);
    const weekLabel = formatWeekLabel(week.weekStart, week.weekEnd);
    
    return `
      <text x="${x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" 
            font-size="12" fill="#64748b">${weekLabel}</text>
      <line x1="${x}" y1="${padding.top + chartHeight}" x2="${x}" y2="${padding.top + chartHeight + 5}" 
            stroke="#64748b" stroke-width="1" />
    `;
  }).join('');
}

function getTrendDirection(weeklyData, currentIndex) {
  if (currentIndex === 0) {
    return { text: 'Baseline', class: 'trend-stable' };
  }
  
  const current = weeklyData[currentIndex];
  const previous = weeklyData[currentIndex - 1];
  
  const totalChange = current.totalCRs - previous.totalCRs;
  const liveChange = current.liveCRs - previous.liveCRs;
  const createdChange = current.createdCRs - previous.createdCRs;
  const pendingChange = current.notLiveCRs - previous.notLiveCRs;
  
  // Determine overall trend
  if (totalChange > 0) {
    return { text: '↗ Growing', class: 'trend-up' };
  } else if (totalChange < 0) {
    return { text: '↘ Declining', class: 'trend-down' };
  } else {
    return { text: '→ Stable', class: 'trend-stable' };
  }
}

function formatWeekLabel(weekStart, weekEnd) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr}-${endStr}`;
}

async function renderCRDashboard() {
  console.log('renderCRDashboard called');
  setActive('#crdashboard');
  
  try {
    await ensureLookups();
    console.log('Lookups loaded successfully for CR Dashboard');
  } catch (error) {
    console.error('Error loading lookups for CR Dashboard:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  
  try {
    const dashboardData = await fetchJSON('/api/cr-dashboard');
    console.log('CR Dashboard data fetched:', dashboardData);
    
    // Enhanced CR dashboard with charts and analytics
    app.innerHTML = `
      <div class="dashboard">
        <div class="dashboard-header">
          <h2>CR Dashboard</h2>
        </div>
        
        ${dashboardData.insights ? `
        <div class="insights-section">
          <div class="insights-header">
            <h3>📊 CR Insights & Recommendations</h3>
          </div>
          <div class="insights-grid">
            <a href="?active=true#crlist" class="insight-card clickable">
              <div class="insight-icon">📈</div>
              <div class="insight-content">
                <div class="insight-label">Active CRs</div>
                <div class="insight-value">${dashboardData.insights.activeCRs} / ${dashboardData.insights.totalCRs}</div>
                <div class="insight-subtext">${Math.round((dashboardData.insights.activeCRs / dashboardData.insights.totalCRs) * 100)}% of portfolio</div>
              </div>
            </a>
            
            <a href="?status=AT+RISK#crlist" class="insight-card clickable ${dashboardData.insights.atRiskCount > 0 ? 'warning' : ''}">
              <div class="insight-icon">⚠️</div>
              <div class="insight-content">
                <div class="insight-label">At Risk</div>
                <div class="insight-value">${dashboardData.insights.atRiskCount}</div>
                <div class="insight-subtext">Requires attention</div>
              </div>
            </a>
            
            <a href="?status=DELAYED#crlist" class="insight-card clickable ${dashboardData.insights.delayedCount > 0 ? 'danger' : ''}">
              <div class="insight-icon">🚨</div>
              <div class="insight-content">
                <div class="insight-label">Delayed</div>
                <div class="insight-value">${dashboardData.insights.delayedCount}</div>
                <div class="insight-subtext">Urgent action needed</div>
              </div>
            </a>
            
            <a href="?status=LIVE#crlist" class="insight-card clickable success">
              <div class="insight-icon">✅</div>
              <div class="insight-content">
                <div class="insight-label">Live CRs</div>
                <div class="insight-value">${dashboardData.insights.liveCount}</div>
                <div class="insight-subtext">Successfully delivered</div>
              </div>
            </a>
            
            <div class="insight-card clickable info" id="new-crs-this-week" style="cursor: pointer;">
              <div class="insight-icon">🆕</div>
              <div class="insight-content">
                <div class="insight-label">New CRs This Week</div>
                <div class="insight-value">${dashboardData.insights.newThisWeekCount || 0}</div>
                <div class="insight-subtext">${dashboardData.insights.weekStart} to ${dashboardData.insights.weekEnd}</div>
              </div>
            </div>
          </div>
          
          <div class="recommendations-box">
            <h4>🎯 Key Recommendations:</h4>
            <ul class="recommendations-list">
              ${dashboardData.insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          
          ${dashboardData.insights.oldestCR ? `
          <div class="insight-details">
            <div class="insight-detail-item">
              <span class="detail-label">📅 Oldest CR:</span>
              <span class="detail-value">${dashboardData.insights.oldestCR.name} (${dashboardData.insights.oldestCR.daysSinceCreated} days)</span>
            </div>
            <div class="insight-detail-item">
              <span class="detail-label">🆕 Newest CR:</span>
              <span class="detail-value">${dashboardData.insights.newestCR.name} (${dashboardData.insights.newestCR.daysSinceCreated} days)</span>
            </div>
            ${dashboardData.insights.mostCommonMilestone ? `
            <div class="insight-detail-item">
              <span class="detail-label">🎯 Most Common Milestone:</span>
              <span class="detail-value">${dashboardData.insights.mostCommonMilestone.milestone} (${dashboardData.insights.mostCommonMilestone.c} CRs)</span>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <div class="insights-card-wrapper">
            <h4 style="margin: 20px 0 12px 0; font-size: 16px; color: #475569;">📈 Weekly CR Trend</h4>
            <div class="trend-chart-container">
              ${createWeeklyTrendChart(dashboardData.weeklyTrendData || [])}
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-number">${dashboardData.avgAgeSinceCreated || 0}</div>
            <div class="stat-label">Avg Age (days)</div>
          </div>
        </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>Status Distribution</h3>
            <div class="chart-container">
              ${createBarChart(convertArrayToObject(dashboardData.byStatus, 'status'), 'status', 'crlist')}
            </div>
          </div>
          
          <div class="dashboard-card">
            <h3>Priority Distribution</h3>
            <div class="chart-container">
              ${createBarChart(convertArrayToObject(dashboardData.byPriority, 'priority'), 'priority', 'crlist')}
            </div>
          </div>
          
          <div class="dashboard-card">
            <h3>Department Distribution</h3>
            <div class="chart-container">
              ${createDepartmentBarChart(convertArrayToObject(dashboardData.byDepartment, 'departmentId'), 'crlist')}
            </div>
          </div>
          
          <div class="dashboard-card">
            <h3>Milestone Distribution</h3>
            <div class="chart-container">
              ${createBarChart(convertArrayToObject(dashboardData.byMilestone, 'milestone'), 'milestone', 'crlist')}
            </div>
          </div>
          
          <div class="dashboard-card full-width">
            <h3>CR Aging (All Active CRs)</h3>
            <div id="cr-aging-container"></div>
          </div>
          
          <div class="dashboard-card full-width">
            <h3>Milestone Durations (Days per Stage)</h3>
            <div id="cr-milestone-container"></div>
          </div>
        </div>
      </div>
    `;
    
    // Initialize CR Aging pagination
    initializeCRAgingPagination(dashboardData);
    
    // Initialize Milestone Durations pagination
    initializeCRMilestonePagination(dashboardData);
    
    // Add click handler for "New CRs This Week" card
    const newCRsCard = document.getElementById('new-crs-this-week');
    if (newCRsCard && dashboardData.insights.newThisWeekCRs) {
      newCRsCard.addEventListener('click', () => {
        showNewCRsModal(dashboardData.insights.newThisWeekCRs, dashboardData.insights.weekStart, dashboardData.insights.weekEnd);
      });
    }
    
  } catch (error) {
    console.error('CR Dashboard error:', error);
    app.innerHTML = `<div class="error">CR Dashboard error: ${error.message}</div>`;
  }
}

async function renderDashboard() {
  console.log('renderDashboard called');
  setActive('#dashboard');
  
  try {
    await ensureLookups();
    console.log('Lookups loaded successfully for Dashboard');
  } catch (error) {
    console.error('Error loading lookups for Dashboard:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  
  try {
    const dashboardData = await fetchJSON('/api/dashboard');
    console.log('Dashboard data fetched:', dashboardData);
    
    // Enhanced dashboard with charts and analytics
    app.innerHTML = `
      <div class="dashboard">
        <div class="dashboard-header">
          <h2>Project Dashboard</h2>
        </div>
        
        ${dashboardData.insights ? `
        <div class="insights-section">
          <div class="insights-header">
            <h3>📊 Project Insights & Recommendations</h3>
          </div>
          <div class="insights-grid">
            <a href="?active=true#list" class="insight-card clickable">
              <div class="insight-icon">📈</div>
              <div class="insight-content">
                <div class="insight-label">Active Projects</div>
                <div class="insight-value">${dashboardData.insights.activeProjects} / ${dashboardData.insights.totalProjects}</div>
                <div class="insight-subtext">${Math.round((dashboardData.insights.activeProjects / dashboardData.insights.totalProjects) * 100)}% of portfolio</div>
              </div>
            </a>
            
            <a href="?status=AT+RISK#list" class="insight-card clickable ${dashboardData.insights.atRiskCount > 0 ? 'warning' : ''}">
              <div class="insight-icon">⚠️</div>
              <div class="insight-content">
                <div class="insight-label">At Risk</div>
                <div class="insight-value">${dashboardData.insights.atRiskCount}</div>
                <div class="insight-subtext">Requires attention</div>
              </div>
            </a>
            
            <a href="?status=DELAYED#list" class="insight-card clickable ${dashboardData.insights.delayedCount > 0 ? 'danger' : ''}">
              <div class="insight-icon">🚨</div>
              <div class="insight-content">
                <div class="insight-label">Delayed</div>
                <div class="insight-value">${dashboardData.insights.delayedCount}</div>
                <div class="insight-subtext">Urgent action needed</div>
              </div>
            </a>
            
            <a href="?status=LIVE#list" class="insight-card clickable success">
              <div class="insight-icon">✅</div>
              <div class="insight-content">
                <div class="insight-label">Live Projects</div>
                <div class="insight-value">${dashboardData.insights.liveCount}</div>
                <div class="insight-subtext">Successfully delivered</div>
              </div>
            </a>
          </div>
          
          <div class="recommendations-box">
            <h4>🎯 Key Recommendations:</h4>
            <ul class="recommendations-list">
              ${dashboardData.insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          
          ${dashboardData.insights.oldestProject ? `
          <div class="insight-details">
            <div class="insight-detail-item">
              <span class="detail-label">📅 Oldest Project:</span>
              <span class="detail-value">${dashboardData.insights.oldestProject.name} (${dashboardData.insights.oldestProject.daysSinceCreated} days)</span>
            </div>
            <div class="insight-detail-item">
              <span class="detail-label">🆕 Newest Project:</span>
              <span class="detail-value">${dashboardData.insights.newestProject.name} (${dashboardData.insights.newestProject.daysSinceCreated} days)</span>
            </div>
            ${dashboardData.insights.mostCommonMilestone ? `
            <div class="insight-detail-item">
              <span class="detail-label">🎯 Most Common Milestone:</span>
              <span class="detail-value">${dashboardData.insights.mostCommonMilestone.milestone} (${dashboardData.insights.mostCommonMilestone.c} projects)</span>
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-number">${dashboardData.projects || 0}</div>
            <div class="stat-label">Total Projects</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${dashboardData.liveYTD || 0}</div>
            <div class="stat-label">Live Projects (YTD)</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${dashboardData.avgAgeSinceCreated || 0}</div>
            <div class="stat-label">Avg Age (days)</div>
          </div>
        </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>Status Distribution</h3>
            <div class="chart-container">
              ${createBarChart(convertArrayToObject(dashboardData.byStatus, 'status'), 'status')}
            </div>
          </div>
          
          <div class="dashboard-card">
            <h3>Priority Distribution</h3>
            <div class="chart-container">
              ${createBarChart(convertArrayToObject(dashboardData.byPriority, 'priority'), 'priority')}
            </div>
          </div>
          
          <div class="dashboard-card">
            <h3>Department Distribution</h3>
            <div class="chart-container">
              ${createDepartmentBarChart(convertArrayToObject(dashboardData.byDepartment, 'departmentId'))}
            </div>
          </div>
          
          <div class="dashboard-card">
            <h3>Milestone Distribution</h3>
            <div class="chart-container">
              ${createBarChart(convertArrayToObject(dashboardData.byMilestone, 'milestone'), 'milestone')}
            </div>
          </div>
          
          <div class="dashboard-card full-width">
            <h3>Project Aging (Top 15 Active Projects)</h3>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Status</th>
                    <th>Milestone</th>
                    <th>Department</th>
                    <th>Age (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(dashboardData.projectAging || [])
                    .filter(p => p.status && p.status.toUpperCase() !== 'NOT STARTED')
                    .sort((a, b) => (b.daysSinceCreated || 0) - (a.daysSinceCreated || 0))
                    .slice(0, 15)
                    .map(p => `
                      <tr class="clickable-row" onclick="location.href='#view/${p.id}'" style="cursor: pointer;">
                        <td>
                          <div class="project-name-cell">
                            <span class="project-name">${p.name || 'Unnamed Project'}</span>
                          </div>
                        </td>
                        <td><span class="status-badge status-${(p.status || '').toLowerCase().replace(/\s+/g, '-')}">${p.status || 'Unknown'}</span></td>
                        <td><span class="milestone-badge">${p.milestone || 'No milestone'}</span></td>
                        <td><span class="department-name">${nameById(LOOKUPS.departments, p.departmentId) || 'Unknown'}</span></td>
                        <td>
                          <span class="aging-value ${(p.daysSinceCreated || 0) > 180 ? 'aging-critical' : (p.daysSinceCreated || 0) > 90 ? 'aging-warning' : 'aging-normal'}">
                            ${p.daysSinceCreated || 0} days
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="dashboard-card full-width">
            <h3>Milestone Durations (Days per Stage)</h3>
            <div class="milestone-table-wrapper">
              <table class="milestone-table">
                <thead>
                  <tr>
                    <th class="sticky-col">Project Name</th>
                    <th>Pre-grooming</th>
                    <th>Grooming</th>
                    <th>Tech Assessment</th>
                    <th>Planning</th>
                    <th>Development</th>
                    <th>Testing</th>
                    <th>Live</th>
                  </tr>
                </thead>
                <tbody>
                  ${generateMilestoneMatrix(dashboardData.milestoneDurations || [])}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Dashboard error:', error);
    app.innerHTML = `<div class="error">Dashboard error: ${error.message}</div>`;
  }
}

function convertArrayToObject(arr, key) {
  if (!arr || !Array.isArray(arr)) return {};
  const obj = {};
  for (const item of arr) {
    obj[item[key]] = item.c;
  }
  return obj;
}

function generateMilestoneMatrix(milestoneDurations, routePrefix = 'view') {
  const milestones = ['Pre-grooming', 'Grooming', 'Tech Assessment', 'Planning', 'Development', 'Testing', 'Live'];
  
  if (!milestoneDurations || milestoneDurations.length === 0) {
    return '<tr><td colspan="8" class="no-data">No milestone duration data available</td></tr>';
  }
  
  return milestoneDurations
    .filter(p => p && p.name && p.milestoneDetails && p.milestoneDetails.length > 0)
    .map(project => {
      // Create a map of milestone -> duration for this project
      const milestoneMap = {};
      
      project.milestoneDetails.forEach(md => {
        if (md && md.milestone) {
          milestoneMap[md.milestone] = md.duration || 0;
        }
      });
      
      // Generate row with all milestone columns
      const cells = milestones.map(milestone => {
        const duration = milestoneMap[milestone];
        if (duration !== undefined) {
          // Check if this is the current milestone
          const isCurrent = project.currentMilestone === milestone;
          return `<td class="milestone-cell ${isCurrent ? 'current-milestone' : 'completed-milestone'}">
            <span class="duration-value-cell ${isCurrent ? 'current' : ''}">${duration}</span>
          </td>`;
        } else {
          return `<td class="milestone-cell empty">-</td>`;
        }
      }).join('');
      
      return `<tr class="clickable-row" onclick="location.href='#${routePrefix}/${project.id}'" style="cursor: pointer;">
        <td class="milestone-project-name sticky-col">${project.name}</td>
        ${cells}
      </tr>`;
    })
    .join('');
}

function resolveDepartmentDistribution(deptDist) {
  const resolved = {};
  for (const [deptId, count] of Object.entries(deptDist)) {
    const deptName = nameById(LOOKUPS.departments, deptId);
    resolved[deptName] = count;
  }
  return resolved;
}

function createDepartmentBarChart(deptDist, targetRoute = 'list') {
  if (!deptDist || Object.keys(deptDist).length === 0) return '<div class="no-data">No data available</div>';
  const max = Math.max(...Object.values(deptDist));
  if (max === 0) return '<div class="no-data">No data available</div>';
  
  return Object.entries(deptDist).map(([deptId, value]) => {
    const deptName = nameById(LOOKUPS.departments, deptId);
    const filterUrl = `?departmentId=${encodeURIComponent(deptId)}#${targetRoute}`;
    
    return `
      <a href="${filterUrl}" class="bar-item clickable">
        <span class="bar-label">${deptName}</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${(value / max) * 100}%"></div>
          <span class="bar-value">${value}</span>
        </div>
      </a>
    `;
  }).join('');
}

function createBarChart(data, filterType = null, targetRoute = 'list') {
  if (!data || Object.keys(data).length === 0) return '<div class="no-data">No data available</div>';
  const max = Math.max(...Object.values(data));
  if (max === 0) return '<div class="no-data">No data available</div>';
  
  return Object.entries(data).map(([key, value]) => {
    // Create the appropriate filter URL based on filter type
    let filterUrl = `?#${targetRoute}`;
    if (filterType && key) {
      const encodedKey = encodeURIComponent(key);
      filterUrl = `?${filterType}=${encodedKey}#${targetRoute}`;
    }
    
    return `
      <a href="${filterUrl}" class="bar-item clickable">
        <span class="bar-label">${key}</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${(value / max) * 100}%"></div>
          <span class="bar-value">${value}</span>
        </div>
      </a>
    `;
  }).join('');
}

// Helper function to format remark text, preserving line breaks and formatting dates
function formatRemark(remark) {
  if (!remark || remark.trim() === '') {
    return 'No remarks.';
  }
  
  // Escape HTML to prevent XSS
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };
  
  // Normalize line breaks
  let text = remark.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Escape HTML first
  text = escapeHtml(text);
  
  // Match date patterns like "2025-12-2:" or "2025-11-13:" at start of line
  const datePattern = /^(\d{4}-\d{1,2}-\d{1,2}:)/gm;
  
  // Check if text contains date patterns
  if (text.match(datePattern)) {
    // Split by date pattern, keeping the dates
    const parts = text.split(/(\d{4}-\d{1,2}-\d{1,2}:)/);
    
    let result = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Check if this part is a date
      if (part.match(/^\d{4}-\d{1,2}-\d{1,2}:$/)) {
        // Add spacing before date if not first element
        if (result) {
          result += '<div style="margin-top: 20px;"></div>';
        }
        result += `<div class="remark-date-header">${part}</div>`;
      } else if (part.trim()) {
        // This is content - preserve line breaks
        let content = part.trim();
        // Replace newlines with <br> tags
        content = content.replace(/\n/g, '<br>');
        result += `<div class="remark-date-content">${content}</div>`;
      }
    }
    
    return result;
  } else {
    // No dates found, just preserve line breaks
    return text.replace(/\n/g, '<br>');
  }
}

async function renderView(id) {
  console.log('renderView called with id:', id);
  setActive('');
  
  try {
    await ensureLookups();
    const initiative = await fetchJSON(`/api/initiatives/${id}`);
    
    app.innerHTML = `
      <div class="view-container">
        <div class="view-header">
          <h2>${initiative.name}</h2>
          <div class="view-actions">
            <a href="#list"><button>← Back to List</button></a>
            <button class="primary">Edit</button>
          </div>
        </div>
        
        <div class="view-grid">
          <div class="view-section">
            <h3>Basic Information</h3>
            <div class="view-field"><label>Ticket:</label><span>${initiative.ticket || 'N/A'}</span></div>
            <div class="view-field"><label>Priority:</label><span class="priority-badge priority-${(initiative.priority || '').toLowerCase()}">${initiative.priority || 'N/A'}</span></div>
            <div class="view-field"><label>Status:</label><span class="status-badge status-${(initiative.status || '').toLowerCase().replace(/\s+/g, '-')}">${initiative.status || 'N/A'}</span></div>
            <div class="view-field"><label>Milestone:</label><span>${initiative.milestone || 'N/A'}</span></div>
            <div class="view-field"><label>Department:</label><span>${nameById(LOOKUPS.departments, initiative.departmentId)}</span></div>
            <div class="view-field"><label>Business Owner:</label><span>${nameById(LOOKUPS.users, initiative.businessOwnerId)}</span></div>
            <div class="view-field"><label>IT PIC:</label><span>${nameById(LOOKUPS.users, initiative.itPicId)}</span></div>
          </div>
          
          <div class="view-section">
            <h3>Timeline</h3>
            <div class="view-field"><label>Created:</label><span>${initiative.createdAt || 'N/A'}</span></div>
            <div class="view-field"><label>Start Date:</label><span>${initiative.startDate || 'N/A'}</span></div>
            <div class="view-field"><label>End Date:</label><span>${initiative.endDate || 'N/A'}</span></div>
            <div class="view-field"><label>Updated:</label><span>${initiative.updatedAt || 'N/A'}</span></div>
            ${initiative.daysSinceCreated ? `<div class="view-field"><label>Age:</label><span>${initiative.daysSinceCreated} days</span></div>` : ''}
          </div>
          
          <div class="view-section full-width">
            <h3>Description</h3>
            <p>${initiative.description || 'No description provided.'}</p>
          </div>
          
          <div class="view-section full-width">
            <h3>Business Impact</h3>
            <p>${initiative.businessImpact || 'No business impact provided.'}</p>
          </div>
          
          <div class="view-section full-width">
            <h3>Remark</h3>
            <div class="remark-content">${formatRemark(initiative.remark)}</div>
          </div>
          
          ${initiative.documentationLink ? `
          <div class="view-section full-width">
            <h3>Project Doc Link</h3>
            <p class="doc-path">${initiative.documentationLink}</p>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading initiative:', error);
    app.innerHTML = `<div class="error">Error loading initiative: ${error.message}</div>`;
  }
}

function router() {
  const h = location.hash || '#list';
  console.log('Router called with hash:', h);
  
  try {
    if (h.startsWith('#view/')) return renderView(h.split('/')[1]);
    if (h.startsWith('#dashboard')) return renderDashboard();
    if (h.startsWith('#crdashboard')) return renderCRDashboard();
    if (h.startsWith('#crlist')) return renderCRList();
    return renderList();
  } catch (error) {
    console.error('Router error:', error);
    app.innerHTML = `<div class="error">Error loading page: ${error.message}</div>`;
  }
}

window.addEventListener('hashchange', router);
router();
