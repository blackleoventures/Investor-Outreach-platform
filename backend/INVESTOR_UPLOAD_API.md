# Investor File Upload API

## Base URL
```
http://localhost:5000/api/investors
```

## Main Upload Endpoint

**POST** `/upload-file`

**Body:** 
- `file`: CSV, Excel (.xlsx/.xls), or JSON file

**Response:**
```json
{
  "success": true,
  "message": "25 investors uploaded successfully",
  "count": 25
}
```

## Other Endpoints

**GET** `/upload-stats` - Get total count
**GET** `/all` - Get all investors
**GET** `/` - Get paginated investors
**POST** `/bulk` - Add investors via JSON
**PUT** `/:id` - Update investor
**DELETE** `/:id` - Delete investor

## Usage Example

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/investors/upload-file', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```