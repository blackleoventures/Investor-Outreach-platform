# Test Instructions

## 🧪 How to Run Tests

### 1. Backend API Test
```bash
cd backend
node ../test-api-endpoints.js
```
**Expected Results:**
- ✅ Health check passes
- ✅ Client creation successful
- ✅ Campaign creation successful
- ✅ Revenue/Investment stored as strings (10M, 25M)

### 2. Frontend Flow Test
1. Open browser and go to `http://localhost:3000`
2. Open Developer Console (F12)
3. Copy and paste content from `test-complete-flow.js`
4. Press Enter to run

**Expected Results:**
- ✅ Test client "FlowTest Inc" created
- ✅ Test campaign "FlowTest Inc_Seed_Outreach" created
- ✅ Data persists after page refresh

### 3. Manual UI Test
1. **Add Client Test:**
   - Go to `/dashboard/add-client`
   - Fill form with test data:
     - Company: "UI Test Company"
     - Founder: "John Smith"
     - Email: "john@uitest.com"
     - Revenue: "2.5M"
     - Investment Ask: "10M"
     - Location: "US"
   - Click "Save Client & Create Campaign"

2. **Verify Client Data:**
   - Go to `/dashboard/all-client`
   - Should see "UI Test Company"
   - Revenue should show "2.5M" (not 2500000)
   - Investment Ask should show "10M" (not 10000000)
   - Location should show "US"

3. **Verify Campaign Data:**
   - Go to `/dashboard/allCampaign`
   - Should see "UI Test Company_[Stage]_Outreach"
   - Status should be "Draft"
   - Should NOT show demo data

4. **Test Persistence:**
   - Refresh page
   - Data should still be visible
   - Navigate between pages
   - Data should persist

### 4. Browser Console Test Functions
After running the complete flow test, use these functions:

```javascript
// Clear all test data
testFlow.clearData();

// Add a test client
testFlow.addTestClient("My Test Company");

// Check stored data
testFlow.checkData();
```

## 🔍 What to Verify

### ✅ Client Data:
- [ ] Shows in all-client table
- [ ] Revenue displays as string (1M, 500K, etc.)
- [ ] Investment Ask displays as string (2M, 10M, etc.)
- [ ] Location shows correctly
- [ ] Data persists on page refresh
- [ ] Can be deleted manually

### ✅ Campaign Data:
- [ ] Shows in manage campaigns (allCampaign page)
- [ ] Name format: "ClientName_Stage_Outreach"
- [ ] Status shows correctly (Draft/Active)
- [ ] Recipients count updates
- [ ] Data persists on page refresh

### ✅ Flow Integration:
- [ ] Add client → redirects to campaign creation
- [ ] Campaign creation → shows campaign details
- [ ] Navigation buttons work correctly
- [ ] Data flows between all steps

## 🐛 Common Issues to Check

1. **Data not showing:** Check browser localStorage in DevTools
2. **Revenue showing as 0:** Verify string handling in backend
3. **Campaign on wrong page:** Check localStorage vs API data loading
4. **Data disappearing:** Verify localStorage persistence

## 📊 Expected Test Results

After running all tests, you should see:
- **Clients:** 2-3 test clients in all-client page
- **Campaigns:** 2-3 test campaigns in manage campaigns page
- **Data Types:** Revenue/Investment as strings (1M, 2.5M, etc.)
- **Persistence:** Data survives page refresh
- **Flow:** Complete client → campaign creation flow works