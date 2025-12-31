# Multi-Select Filters Implementation

## Overview
The CR List now supports multi-select filters, allowing users to select multiple values for each filter type (Department, Priority, Status, and Milestone). The list will display all CRs that match ANY of the selected values in each filter category.

## Features Implemented

### 1. Multi-Select Dropdowns
- **Department Filter**: Select multiple departments to view CRs from any of them
- **Priority Filter**: Select multiple priorities (P0, P1, P2)
- **Status Filter**: Select multiple statuses (NOT STARTED, ON HOLD, ON TRACK, AT RISK, DELAYED, LIVE, CANCELLED)
- **Milestone Filter**: Select multiple milestones (Pre-grooming, Grooming, Tech Assessment, Planning, Development, Testing, Live)

### 2. User Interface Enhancements

#### Interactive Multi-Select Dropdowns
- Click on a dropdown to expand it
- Click on any option to toggle its selection (select/deselect)
- Selected options are highlighted in blue with white text
- Dropdowns automatically expand when focused and collapse when blurred

#### Apply & Clear Buttons
- **Apply Filters**: Click to apply selected filters and update the CR list
- **Clear All**: Click to remove all active filters and reset the view

#### Active Filters Display
- Visual badges show all currently active filters
- Each badge displays the filter type and value
- Click the "×" button on any badge to remove that specific filter
- Filters are color-coded and animated for better UX

#### Help Tip
- An informative tip appears above the filter badges
- Provides guidance on how to use the multi-select feature

### 3. Backend Updates

#### API Changes
The `/api/initiatives` endpoint now supports comma-separated values for filters:

**Example URL:**
```
/api/initiatives?type=CR&status=LIVE,AT%20RISK,DELAYED&priority=P0,P1&departmentId=dept1,dept2
```

**Filter Logic:**
- Multiple values within the same filter are combined with OR logic
- Different filter types are combined with AND logic
- Example: `status=LIVE,AT RISK` means "show CRs with status LIVE OR AT RISK"

### 4. URL Parameter Handling
- Filter selections are stored in URL parameters
- Users can bookmark or share filtered views
- Page navigation preserves filter state
- Format: `?status=LIVE,DELAYED&priority=P0#crlist`

## How to Use

### Basic Usage
1. Navigate to the **CR List** page
2. Click on any filter dropdown (Department, Priority, Status, or Milestone)
3. Click on the options you want to select (multiple selections allowed)
4. Click the **Apply Filters** button to update the list
5. The filtered results will appear with active filter badges displayed

### Removing Filters
**Option 1: Remove Individual Filters**
- Click the "×" button on any filter badge to remove just that filter

**Option 2: Clear All Filters**
- Click the **Clear All** button to remove all filters at once

### Advanced Usage
- Combine multiple filter types for precise filtering
  - Example: Show CRs that are (Status: LIVE OR AT RISK) AND (Priority: P0 OR P1)
- Share filtered views by copying the URL
- Bookmark commonly used filter combinations

## Technical Details

### Files Modified

#### Backend
- `src/routes/initiatives.js`: Updated GET endpoint to parse comma-separated filter values

#### Frontend
- `src/public/main-simple.js`:
  - Updated `renderCRList()` function with multi-select support
  - Added filter badge generation
  - Added event handlers for multi-select behavior
  - Added global `removeFilter()` function

#### Styling
- `src/public/styles.css`:
  - Added styles for multi-select dropdowns
  - Added styles for filter badges and active filters display
  - Added styles for filter groups and buttons
  - Added help tip styling

### Filter Logic Example

When a user selects:
- **Status**: LIVE, AT RISK, DELAYED
- **Priority**: P0, P1

The system will show CRs where:
- Status is one of: LIVE, AT RISK, or DELAYED
- **AND**
- Priority is one of: P0 or P1

### Browser Compatibility
- Works on all modern browsers
- Uses standard HTML5 multi-select functionality
- Enhanced with custom JavaScript for better UX
- Fallback behavior available for older browsers

## Benefits

1. **Improved Filtering**: Users can now view CRs matching multiple criteria at once
2. **Better UX**: Visual feedback with badges showing active filters
3. **Time Saving**: No need to apply filters multiple times
4. **Flexibility**: Easy to add or remove specific filters
5. **Transparency**: Active filters are clearly visible
6. **Shareable**: URLs can be shared with pre-applied filters

## Future Enhancements (Potential)

- Add filter presets/saved views
- Add "Select All" / "Deselect All" options for each filter
- Add filter history/recent filters
- Add keyboard shortcuts for filter operations
- Add drag-and-drop reordering of filter badges

## Testing

To test the multi-select filters:

1. Start the server: `npm start` or `node src/server.js`
2. Open browser: `http://localhost:3000`
3. Navigate to **CR List**
4. Test various filter combinations
5. Verify that:
   - Multiple selections work correctly
   - Apply Filters updates the list
   - Clear All removes all filters
   - Individual badge removal works
   - URL parameters update correctly
   - Page reload preserves filters

## Support

For issues or questions about the multi-select filter feature, please refer to:
- Main README.md
- TROUBLESHOOTING.md
- Or contact the development team

