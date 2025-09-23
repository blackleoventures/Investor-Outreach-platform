"use client";

import { useState } from 'react';
import { Button } from 'antd';

export default function TestApiPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/investors?limit=5&page=1', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const result = await response.json();
      console.log('=== FRONTEND API TEST ===');
      console.log('API Response:', result);
      
      const dataArray = result.docs || result.data || [];
      console.log('Data array length:', dataArray.length);
      
      if (dataArray.length > 0) {
        console.log('\n=== FIRST RECORD ===');
        console.log(dataArray[0]);
        console.log('\n=== COLUMN NAMES ===');
        console.log(Object.keys(dataArray[0]));
        
        console.log('\n=== CHECKING REAL DATA ===');
        const first = dataArray[0];
        console.log('Investor Name:', first['Investor Name']);
        console.log('Partner Name:', first['Partner Name']);
        console.log('Partner Email:', first['Partner Email']);
        console.log('Fund Type:', first['Fund Type']);
        console.log('Location:', first['Location']);
        
        console.log('\n=== FIRST 3 RECORDS ===');
        dataArray.slice(0, 3).forEach((record, i) => {
          console.log(`Record ${i+1}: ${record['Investor Name']} - ${record['Partner Name']}`);
        });
      } else {
        console.log('NO DATA RECEIVED!');
      }
      
      setData(result);
    } catch (error) {
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">API Test Page</h1>
      
      <Button 
        type="primary" 
        onClick={testApi} 
        loading={loading}
        className="mb-4"
      >
        Test API
      </Button>

      {data && (
        <div>
          <h2 className="text-lg mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}