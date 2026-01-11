# QA Checklist: Programs Module (Diets + Lifestyle)

## Overview
This checklist ensures the Programs module (Diets and Lifestyle tabs) works correctly across all features.

## Test Environment
- Language: Test in EN, RU, KK
- Device: iOS/Android
- User: Authenticated user with active program

## Checklist

### 1. Tab Switching
- [ ] Switching between "Диеты" and "Стиль жизни" tabs changes entire screen content
- [ ] Search query clears when switching tabs
- [ ] Filters reset when switching tabs
- [ ] Scroll position resets when switching tabs

### 2. Search Functionality
- [ ] Search works separately in "Диеты" tab (searches diet names)
- [ ] Search works separately in "Стиль жизни" tab (searches lifestyle program name/tagline/vibe)
- [ ] Search results update in real-time as user types
- [ ] Search clears when switching tabs
- [ ] Empty search shows all items

### 3. Details Screens
- [ ] Clicking diet card opens `DietProgramDetail` screen
- [ ] Clicking lifestyle card opens `LifestyleDetail` screen
- [ ] Back button returns to list
- [ ] Details show all required information
- [ ] Lifestyle details show mandatory disclaimer at top

### 4. Start/Continue Buttons
- [ ] "Start Program" button works for diets
- [ ] "Start Program" button works for lifestyle
- [ ] "Continue" button shows when program is active
- [ ] Starting program creates active program
- [ ] Starting program navigates to tracker/progress screen

### 5. Tracker Display
- [ ] DailyDietTracker shows for active diet
- [ ] Checklist items are checkable
- [ ] Progress ring updates correctly
- [ ] Streak displays correctly
- [ ] Symptoms section shows for medical diets only

### 6. Day Completion
- [ ] "Завершить день" button works
- [ ] After completion, progress updates on Dashboard immediately
- [ ] After completion, progress updates on ProgressScreen immediately
- [ ] After completion, progress updates on Tracker immediately
- [ ] Day index increments correctly
- [ ] Days left decreases correctly
- [ ] Next day checklist is empty (not copied from previous day)
- [ ] Streak updates based on completionRate >= 0.6

### 7. Celebration Animation
- [ ] Celebration modal shows when day is completed
- [ ] Celebration shows only once per day (celebrationShown flag)
- [ ] Celebration does not show again when returning to screen
- [ ] Confetti animation plays
- [ ] Praise text matches completionRate (perfect/excellent/great/good)
- [ ] Modal auto-closes after 2 seconds or on "Continue" button
- [ ] Modal does not break navigation

### 8. Localization
- [ ] No translation keys displayed to users (e.g., "diets.tracker.streak" should not appear)
- [ ] All text is translated in EN/RU/KK
- [ ] Fallback text is shown if translation missing (never show key)
- [ ] Language switching updates all text immediately

### 9. Diet Deduplication
- [ ] No duplicate diets in list (check by slug)
- [ ] No duplicate diets by name (case-insensitive)
- [ ] Each diet has unique slug
- [ ] API returns unique diets only

### 10. Lifestyle Programs
- [ ] 42 programs exist in data
- [ ] Programs distributed: TRENDING (8), GOAL_LOSE_WEIGHT (4), GOAL_BUILD_MUSCLE (4), GOAL_CLEAR_SKIN (3), GOAL_MORE_ENERGY (3), DESTINATIONS (5), AESTHETICS (5), WARRIOR_MODE (6), SEASONAL (4)
- [ ] Category counts are calculated dynamically (not hardcoded)
- [ ] Disclaimer shows on Lifestyle tab
- [ ] Disclaimer shows on Lifestyle detail screen
- [ ] No forbidden words: "Diet/Диета/Запрещено/Правила/План питания" in UI
- [ ] Uses allowed terms: "inspiration", "philosophy", "embrace", "minimize", "sample day", "daily mantra"

### 11. Category Filters
- [ ] Category chips show correct counts dynamically
- [ ] Selecting category filters programs
- [ ] "All" shows all programs
- [ ] Category selection works in Lifestyle tab
- [ ] Type/Difficulty filters work in Diets tab

### 12. Trending Section
- [ ] Trending section shows TRENDING category programs
- [ ] Trending carousel scrolls horizontally
- [ ] Trending programs are clickable
- [ ] Trending section only shows when no search query

### 13. Progress Synchronization
- [ ] Progress syncs across Dashboard, ProgressScreen, Tracker
- [ ] Refresh on focus updates progress
- [ ] Store (ProgramProgressStore) is single source of truth
- [ ] No stale data after day completion

### 14. Circular Progress
- [ ] Progress ring renders correctly (not crooked)
- [ ] Progress percentage matches data (completedCount/totalCount)
- [ ] Progress updates smoothly
- [ ] Progress color changes based on completion rate

## Test Cases

### Test Case 1: Complete Day Flow
1. Open active diet progress screen
2. Complete checklist items
3. Click "Завершить день"
4. Verify:
   - Celebration modal shows
   - Day increments
   - Days left decreases
   - Next day checklist is empty
   - Progress updates on Dashboard

### Test Case 2: Tab Switching
1. Open DietsScreen
2. Search for "keto" in Diets tab
3. Switch to Lifestyle tab
4. Verify:
   - Search is cleared
   - Lifestyle programs shown
   - Can search lifestyle programs separately

### Test Case 3: Lifestyle Forbidden Words
1. Open any Lifestyle program detail
2. Check all text
3. Verify:
   - No "Diet", "Диета", "Запрещено", "Правила", "План питания"
   - Uses "inspiration", "philosophy", "embrace", "minimize"

### Test Case 4: Localization
1. Switch language to RU
2. Navigate through all screens
3. Verify:
   - No translation keys shown
   - All text in Russian
4. Repeat for KK

## Known Issues
- None currently

## Notes
- Celebration uses `celebrationShown` flag in daily log
- Progress calculated from calendar dates (startDate → today)
- Streak threshold: 0.6 (60% completion)
