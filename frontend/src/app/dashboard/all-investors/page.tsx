/* eslint-disable */
// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Card, Typography, Button, Input, Table, Tag, Space, message, Avatar, Modal, Form, Select, Dropdown, Checkbox, Alert, Spin } from "antd";
import { useRouter } from 'next/navigation';
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined, FileTextOutlined, FileExcelOutlined, SyncOutlined, DownloadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function AllInvestorsPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState([]);
  const [filteredInvestors, setFilteredInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addInvestorModal, setAddInvestorModal] = useState(false);
  const [editInvestorModal, setEditInvestorModal] = useState(false);
  const [viewInvestorModal, setViewInvestorModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [excelSyncStatus, setExcelSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCount, setVisibleCount] = useState(10);
  const [userShowAll, setUserShowAll] = useState(false);

  const [form] = Form.useForm();
  const [visibleColumns, setVisibleColumns] = useState({
    serialNumber: true,
    investorName: true,
    partnerName: true,
    partnerEmail: true,
    fundType: true,
    fundStage: true,
    country: true,
    phoneNumber: true,
    state: true,
    city: true,
    ticketSize: true,
    sectorFocus: false,
    website: false,
    location: false,
    foundedYear: false,
    portfolioCompanies: false,
    twitterLink: false,
    linkedinLink: false,
    facebookLink: false,
    numberOfInvestments: false,
    numberOfExits: false,
    fundDescription: false
  });

  // Normalize incoming records to our canonical keys used by the table
  const normalizeInvestor = (raw) => {
    // Build case-insensitive lookup maps for robust header matching from CSV/Excel
    const lowerKeyToValue = {} as Record<string, any>;
    const compactKeyToValue = {} as Record<string, any>;
    const alnumKeyToValue = {} as Record<string, any>;
    Object.entries(raw || {}).forEach(([key, value]) => {
      const lower = key.toString().trim().toLowerCase();
      const compact = lower.replace(/[\s_]/g, '');
      const alnum = lower.replace(/[^a-z0-9]/g, '');
      if (!(lower in lowerKeyToValue)) lowerKeyToValue[lower] = value;
      if (!(compact in compactKeyToValue)) compactKeyToValue[compact] = value;
      if (!(alnum in alnumKeyToValue)) alnumKeyToValue[alnum] = value;
    });

    const pick = (candidates: string[]) => {
      for (const candidate of candidates) {
        // 1) Exact (original case) key on the raw object
        if (Object.prototype.hasOwnProperty.call(raw, candidate) && raw[candidate] != null && raw[candidate] !== '') {
          return raw[candidate];
        }
        // 2) Case-insensitive direct match
        const lower = candidate.toLowerCase();
        if (lower in lowerKeyToValue) {
          const v = lowerKeyToValue[lower];
          if (v != null && v !== '') return v;
        }
        // 3) Tolerate spaces vs underscores and other minor formatting
        const variants = [
          lower.replace(/\s+/g, '_'), // spaces -> underscores
          lower.replace(/_/g, ' '),    // underscores -> spaces
          lower.replace(/[\s_]/g, ''),// remove both
          lower.replace(/[^a-z0-9]/g, ''), // remove all punctuation
        ];
        for (const vkey of variants) {
          if (vkey in lowerKeyToValue) {
            const v = lowerKeyToValue[vkey];
            if (v != null && v !== '') return v;
          }
          if (vkey in compactKeyToValue) {
            const v = compactKeyToValue[vkey];
            if (v != null && v !== '') return v;
          }
          if (vkey in alnumKeyToValue) {
            const v = alnumKeyToValue[vkey];
            if (v != null && v !== '') return v;
          }
        }
      }
      return undefined;
    };

    const locationRaw = (() => {
      // Try to capture a generic location field for later parsing into city/state
      return pick([
        'location', 'hq_location', 'hq location', 'headquarters', 'headquarter', 'headquarter location',
        'based in', 'base location', 'office location', 'city/state/country', 'city, state, country'
      ]);
    })();

    // Attempt to derive city/state from a generic location string if available
    let derivedCity: any = undefined;
    let derivedState: any = undefined;
    if (typeof locationRaw === 'string' && locationRaw.trim() !== '') {
      const parts = locationRaw.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // Assume format like "City, State, Country" or "City, State"
        derivedCity = parts[0];
        derivedState = parts[1];
      }
    }

    // Build ticket size with robust derivation from various shapes
    const baseTicket = pick([
      'ticket_size', 'ticketSize', 'ticket', 'ticket size', 'cheque size', 'check size', 'ticket size ($)',
      'ticket-size', 'average ticket size', 'avg ticket size', 'avg. ticket size', 'investment size',
      'investment range', 'investment amount', 'checksize', 'chequesize', 'typical check size', 'typical ticket size',
      'ticket size (optional)'
    ]);
    let derivedTicket: any = baseTicket;
    // If no direct value, try min/max based composition
    if (derivedTicket == null || derivedTicket === '') {
      const tMin = pick([
        'ticket_size_min', 'min_ticket_size', 'min ticket size', 'min check size', 'minimum ticket size',
        'minimum check size', 'min investment size', 'min cheque size', 'min investment amount'
      ]);
      const tMax = pick([
        'ticket_size_max', 'max_ticket_size', 'max ticket size', 'max check size', 'maximum ticket size',
        'maximum check size', 'max investment size', 'max cheque size', 'max investment amount'
      ]);
      if ((tMin != null && tMin !== '') || (tMax != null && tMax !== '')) {
        const left = (tMin != null && tMin !== '') ? tMin : '—';
        const right = (tMax != null && tMax !== '') ? tMax : '—';
        derivedTicket = `${left} - ${right}`;
      }
    }
    // If still empty, try common alternate keys that often hold ticket size values
    if (derivedTicket == null || derivedTicket === '') {
      const alt = pick([
        'avg_ticket_size', 'average_ticket_size', 'typical_ticket_size', 'typical check size',
        'investment_range', 'investment amount', 'investment_amount', 'investment_size',
        'cheque_size', 'check_size', 'ticket'
      ]);
      if (alt != null && alt !== '') derivedTicket = alt;
    }
    // Heuristic: last-resort search for any header that looks like ticket/cheque size or investment range/amount
    if (derivedTicket == null || derivedTicket === '') {
      for (const [k, v] of Object.entries(raw || {})) {
        const lk = k.toString().toLowerCase();
        const looksLikeTicket = (lk.includes('ticket') || lk.includes('cheque') || lk.includes('check')) && lk.includes('size');
        const looksLikeInvestment = lk.includes('investment') && (lk.includes('range') || lk.includes('amount') || lk.includes('size'));
        if ((looksLikeTicket || looksLikeInvestment) && v != null && v !== '') {
          derivedTicket = v;
          break;
        }
      }
    }

    // Spread raw first, then override with normalized canonical fields so normalized wins
    return {
      ...raw,
      // preserve id for row key and actions
      id: raw.id ?? raw._id ?? undefined,
      // canonical fields with robust, case-insensitive fallbacks
      investor_name: pick([
        'investor_name', 'firm_name', 'investorName', 'name', 'investor', 'investor name', 'firm', 'company name'
      ]),
      partner_name: pick([
        'partner_name', 'partnerName', 'partner', 'partner name', 'contact name', 'person name'
      ]),
      partner_email: pick([
        'partner_email', 'email', 'partnerEmail', 'email_id', 'emailId', 'emailAddress', 'email address', 'contact email', 'primary email'
      ]),
      phone_number: pick([
        'phone_number', 'phone', 'phoneNumber', 'mobile', 'mobile_number', 'mobileNumber', 'phone number', 'contact number', 'mobile no', 'mobile number'
      ]),
      fund_type: pick([
        'fund_type', 'type', 'fundType', 'fund type'
      ]),
      fund_stage: pick([
        'fund_stage', 'stage', 'fundStage', 'fund stage'
      ]),
      country: pick([
        'country', 'Country'
      ]),
      state: pick([
        'state', 'State', 'province', 'region', 'state/province', 'state or province', 'county', 'governorate',
        'state (optional)'
      ]) ?? derivedState,
      city: pick([
        'city', 'City', 'town', 'municipality', 'city/town', 'hq city', 'headquarter city',
        'city (optional)'
      ]) ?? derivedCity,
      sector_focus: pick([
        'sector_focus', 'sector focus', 'fund focus', 'focus', 'sectors', 'industry', 'industries'
      ]),
      // Ensure normalized ticket size is placed where table expects it
      ticket_size: derivedTicket ?? raw.ticket_size ?? raw.ticketSize ?? raw['ticket size'],
      website: pick([
        'website', 'Website', 'url', 'site'
      ]),
      linkedIn_link: pick([
        'linkedin', 'linkedin_link', 'linkedIn', 'linkedin url', 'linkedin profile', 'linkedIn_link'
      ]),
      twitter_link: pick([
        'twitter', 'twitter_link', 'twitter url', 'x url'
      ]),
      facebook_link: pick([
        'facebook', 'facebook_link', 'facebook url'
      ]),
      number_of_investments: pick([
        'number_of_investments', 'no of investments', 'investments', 'num investments'
      ]),
      number_of_exits: pick([
        'number_of_exits', 'no of exits', 'exits', 'num exits'
      ]),
      founded_year: pick([
        'founded_year', 'founded year', 'year founded', 'established', 'established year'
      ]),
      location: locationRaw ?? pick(['location', 'Location']),
    };
  };

  // Fetch investors data from API
  const fetchInvestors = async () => {
    setLoading(true);
    try {
      // Fetch a large page from the paginated endpoint so we have the full dataset client-side
      const response = await apiFetch(`/api/investors?limit=100000&page=1`);
      if (response.ok) {
        const result = await response.json();
        const investorData = result.docs || result.data || [];
        // De-duplicate rows defensively by id/email
        const seen = new Set();
        const unique = [] as any[];
        for (const item of investorData) {
          const key = `${item.id ?? ''}-${(item.partner_email ?? '').toString().toLowerCase()}`;
          if (!seen.has(key)) { seen.add(key); unique.push(item); }
        }
        const normalized = unique.map(normalizeInvestor);
        setInvestors(normalized);
        setFilteredInvestors(normalized);
        
        // Update visible columns based on available data
        if (investorData.length > 0) {
          const firstRecord = normalized[0];
          const availableColumns = {} as any;
          
          Object.keys(firstRecord).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && key !== 'uploadedAt') {
              availableColumns[key] = true;
            }
          });
          
          setVisibleColumns(prev => ({ ...prev, ...availableColumns }));
        }
      } else {
        console.error('API Error:', response.status);
      }
    } catch (error) {
      console.error('Error fetching investors:', error);
      message.error('Failed to fetch investors data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Excel sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await apiFetch(`/api/excel/sync/status`);
      if (response.ok) {
        const data = await response.json();
        setExcelSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  // Sync Firebase to Excel
  const handleSyncToExcel = async () => {
    setSyncing(true);
    try {
      const response = await apiFetch(`/api/excel/sync/firebase-to-excel`, {
        method: 'POST'
      });
      if (response.ok) {
        message.success('Data synced to Excel successfully!');
        fetchSyncStatus();
      } else {
        message.error('Failed to sync data to Excel');
      }
    } catch (error) {
      console.error('Sync error:', error);
      message.error('Failed to sync data to Excel');
    } finally {
      setSyncing(false);
    }
  };

  // Download Excel file
  const handleDownloadExcel = async () => {
    try {
      const response = await apiFetch(`/api/excel/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'investors.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Excel file downloaded successfully!');
      } else {
        message.error('Failed to download Excel file');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download Excel file');
    }
  };

  // Initialize data and sync status
  useEffect(() => {
    fetchInvestors();
    fetchSyncStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchInvestors();
      fetchSyncStatus();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    const candidateKeys = [
      // Names
      'investor_name', 'investorName', 'name',
      'partner_name', 'partnerName', 'partner',
      // Emails
      'partner_email', 'email', 'email_id', 'emailId', 'emailAddress',
      // Phones
      'phone_number', 'phone', 'phoneNumber', 'mobile', 'mobile_number', 'mobileNumber',
      // Extras commonly searched
      'sector_focus', 'focus', 'country', 'city', 'state'
    ];

    const stringIncludes = (value: unknown, query: string) => {
      if (value == null) return false;
      if (Array.isArray(value)) {
        return value.some(v => stringIncludes(v, query));
      }
      const str = value.toString().toLowerCase();
      return str.includes(query);
    };

    const filtered = q
      ? investors.filter((inv) => {
          // 1) Try known fields first
          for (const key of candidateKeys) {
            if (key in inv && stringIncludes((inv as any)[key], q)) return true;
          }
          // 2) Fallback: scan all primitive string/number fields
          for (const [k, v] of Object.entries(inv)) {
            if (v == null) continue;
            const isPrimitive = typeof v === 'string' || typeof v === 'number';
            if (isPrimitive && stringIncludes(v, q)) return true;
            if (Array.isArray(v) && stringIncludes(v, q)) return true;
          }
          return false;
        })
      : investors;

    // De-duplicate visible rows robustly using a stable hash of significant fields
    const toKey = (r: any) => {
      return JSON.stringify({
        id: r.id ?? r._id ?? null,
        email: (r.partner_email ?? r.email ?? '').toString().toLowerCase(),
        name: (r.investor_name ?? r.name ?? '').toString().toLowerCase(),
      });
    };
    const seen = new Set<string>();
    const uniqueFiltered = [] as any[];
    for (const row of filtered) {
      const k = toKey(row);
      if (!seen.has(k)) { seen.add(k); uniqueFiltered.push(row); }
    }

    setFilteredInvestors(uniqueFiltered);
    // Preserve user's current view size unless search text changed to a new query
    // If user selected "All", keep expanding to the full filtered length on refresh/polling
    setVisibleCount(prev => {
      const nextMax = uniqueFiltered.length;
      if (userShowAll) return nextMax;
      return Math.min(prev, nextMax);
    });
    setCurrentPage(1);
  }, [searchQuery, investors, userShowAll]);

  // Reset pagination only when the search query itself changes
  useEffect(() => {
    setVisibleCount(10);
    setUserShowAll(false);
  }, [searchQuery]);

  const handleAddInvestor = async (values) => {
    const newInvestor = {
      id: Date.now(),
      ...values
    };
    
    setInvestors([...investors, newInvestor]);
    setAddInvestorModal(false);
    form.resetFields();
    message.success("Investor added successfully!");
  };

  const handleEditInvestor = async (values) => {
    try {
      const id = selectedInvestor?.id ?? selectedInvestor?._id;
      if (!id) {
        message.error('Missing investor id');
        return;
      }

      // Remove undefined fields so we only send real updates
      const updates = Object.fromEntries(
        Object.entries(values || {}).filter(([, v]) => v !== undefined)
      );

      const response = await apiFetch(`/api/investors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        message.success("Investor updated successfully!");
        fetchInvestors(); // Refresh data
        // Excel sync not needed with file-based system
      } else {
        const err = await response.json().catch(() => ({} as any));
        message.error(err.error || 'Failed to update investor');
      }
    } catch (error) {
      message.error('Failed to update investor');
    }
    
    setEditInvestorModal(false);
    setSelectedInvestor(null);
    form.resetFields();
  };

  const handleDeleteInvestor = (investorId) => {
    Modal.confirm({
      title: "Delete Investor",
      content: "Are you sure you want to delete this investor?",
      okText: 'OK',
      okButtonProps: {
        style: { backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' }
      },
      onOk: async () => {
        try {
          const response = await apiFetch(`/api/investors/${investorId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            message.success("Investor deleted successfully!");
            fetchInvestors(); // Refresh data
            // Excel sync not needed with file-based system
          } else {
            message.error('Failed to delete investor');
          }
        } catch (error) {
          message.error('Failed to delete investor');
        }
      }
    });
  };

  const handleColumnVisibilityChange = (columnKey, checked) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: checked
    }));
  };

  // Generate dynamic columns based on data
  const generateDynamicColumns = () => {
    if (investors.length === 0) return [];

    // Build a union of keys across all records so newly added fields appear
    const keySet = new Set<string>();
    for (const inv of investors) {
      Object.keys(inv || {}).forEach(k => {
        if (k !== 'id' && k !== 'createdAt' && k !== 'uploadedAt') keySet.add(k);
      });
    }

    // Preferred order for commonly used keys
    const preferredOrder = [
      'investor_name', 'partner_name', 'partner_email', 'phone_number',
      'fund_type', 'fund_stage', 'country', 'state', 'city', 'sector_focus',
      'ticket_size', 'website', 'location', 'founded_year',
      'portfolio_companies', 'number_of_investments', 'number_of_exits',
      'twitter_link', 'linkedIn_link', 'facebook_link'
    ];

    const keys = Array.from(keySet);
    keys.sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.localeCompare(b);
    });

    const dynamicCols = keys.map(key => ({
      key,
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dataIndex: key,
      width: 150,
      render: (value: any) => {
        if (value == null || value === '') return 'N/A';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'string' && value.length > 50) {
          return <span title={value}>{value.substring(0, 50)}...</span>;
        }
        return value.toString();
      },
    }));

    return dynamicCols;
  };
  
  const columnDefinitions = generateDynamicColumns();
  
  const staticColumnDefinitions = [
    {
      key: 'investorName',
      title: 'Investor Name (Required)',
      dataIndex: 'investor_name',
      width: 180,
      render: (name) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong className="truncate">{name || 'N/A'}</Text>
        </div>
      ),
    },
    {
      key: 'partnerName',
      title: 'Partner Name (Required)',
      dataIndex: 'partner_name',
      width: 140,
      render: (name) => name || 'N/A',
    },
    {
      key: 'partnerEmail',
      title: 'Partner Email (Required)',
      dataIndex: 'partner_email',
      width: 200,
      render: (email) => email ? <Text copyable ellipsis>{email}</Text> : 'N/A',
    },
    {
      key: 'phoneNumber',
      title: 'Phone Number (Optional)',
      dataIndex: 'phone_number',
      width: 140,
      render: (phone) => phone || 'N/A',
    },
    {
      key: 'fundType',
      title: 'Fund Type (Required)',
      dataIndex: 'fund_type',
      width: 120,
      render: (type) => type || 'N/A',
    },
    {
      key: 'fundStage',
      title: 'Fund Stage (Required)',
      dataIndex: 'fund_stage',
      width: 140,
      render: (stage) => stage ? <Tag color="blue">{stage}</Tag> : 'N/A',
    },
    {
      key: 'country',
      title: 'Country (Required)',
      dataIndex: 'country',
      width: 120,
      render: (country) => country || 'N/A',
    },
    {
      key: 'sectorFocus',
      title: 'Sector Focus (Optional)',
      dataIndex: 'sector_focus',
      width: 200,
      render: (focus) => {
        if (!focus) return 'N/A';
        const sectors = typeof focus === 'string' ? focus.split(', ') : (Array.isArray(focus) ? focus : [focus]);
        return (
          <div className="flex flex-wrap gap-1">
            {sectors.slice(0, 2).map((sector, index) => (
              <Tag key={index} color="green">{sector}</Tag>
            ))}
            {sectors.length > 2 && <Tag>+{sectors.length - 2}</Tag>}
          </div>
        );
      },
    },
    {
      key: 'state',
      title: 'State (Optional)',
      dataIndex: 'state',
      width: 100,
      render: (state) => state || 'N/A',
    },
    {
      key: 'city',
      title: 'City (Optional)',
      dataIndex: 'city',
      width: 100,
      render: (city) => city || 'N/A',
    },
    {
      key: 'ticketSize',
      title: 'Ticket Size (Optional)',
      dataIndex: 'ticket_size',
      width: 120,
      render: (size) => {
        if (size == null || size === '') return 'N/A';
        if (Array.isArray(size)) return size.join(', ');
        if (typeof size === 'object') {
          const min = (size.min ?? size.minimum ?? size.minTicket ?? size.min_ticket_size);
          const max = (size.max ?? size.maximum ?? size.maxTicket ?? size.max_ticket_size);
          if (min || max) return `${min ?? '—'} - ${max ?? '—'}`;
          try { return JSON.stringify(size); } catch { return 'N/A'; }
        }
        return size.toString();
      },
    },
    // Keep any extra fields off by default for this view
  ];

  // Force fixed set/order of columns matching the add form
  const visibleColumnsArray = staticColumnDefinitions.filter(col => (visibleColumns as any)[col.key]);

  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Button 
          size="small" 
          icon={<EyeOutlined />} 
          onClick={() => { setSelectedInvestor(record); setViewInvestorModal(true); }}
        />
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => {
            setSelectedInvestor(record);
            form.setFieldsValue(record);
            setEditInvestorModal(true);
          }}
        />
        <Button 
          size="small" 
          icon={<DeleteOutlined />} 
          danger 
          onClick={() => handleDeleteInvestor(record.id)}
        />
      </Space>
    ),
  };

  const serialColumn = {
    key: 'serialNumber',
    title: 'Sr. No.',
    width: 80,
    align: 'center' as const,
    render: (_: any, __: any, index: number) => index + 1,
  };
  const finalColumns = [serialColumn, ...visibleColumnsArray, actionsColumn];

  const customizeColumnsMenu = {
    items: [
      {
        key: 'customize-panel',
        label: (
          <div className="w-64" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="p-2 border-b border-gray-200 mb-2">
              <Text strong className="text-gray-800">Select Columns</Text>
            </div>
            
            <div className="space-y-1 px-2 pb-2">
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.investorName}
                  onChange={(e) => handleColumnVisibilityChange('investorName', e.target.checked)}
                >
                  Investor name
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerName}
                  onChange={(e) => handleColumnVisibilityChange('partnerName', e.target.checked)}
                >
                  Partner name
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerEmail}
                  onChange={(e) => handleColumnVisibilityChange('partnerEmail', e.target.checked)}
                >
                  Email
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.phoneNumber}
                  onChange={(e) => handleColumnVisibilityChange('phoneNumber', e.target.checked)}
                >
                  Phone number
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundType}
                  onChange={(e) => handleColumnVisibilityChange('fundType', e.target.checked)}
                >
                  Fund type
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundStage}
                  onChange={(e) => handleColumnVisibilityChange('fundStage', e.target.checked)}
                >
                  Fund stage
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.country}
                  onChange={(e) => handleColumnVisibilityChange('country', e.target.checked)}
                >
                  Country
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.state}
                  onChange={(e) => handleColumnVisibilityChange('state', e.target.checked)}
                >
                  State (Optional)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.city}
                  onChange={(e) => handleColumnVisibilityChange('city', e.target.checked)}
                >
                  City (Optional)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.ticketSize}
                  onChange={(e) => handleColumnVisibilityChange('ticketSize', e.target.checked)}
                >
                  Ticket Size (Optional)
                </Checkbox>
              </div>
            </div>
          </div>
        ),
      },
    ],
  };

  return (
    <div className="p-6">
      <Card
        title={
          <Title level={4} className="!mb-0">
            All Investors
          </Title>
        }
        extra={
          <Space>
            <Dropdown
              menu={customizeColumnsMenu}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />}>
                Customize Columns
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'manual',
                    label: (
                      <div className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 bg-blue-100 rounded flex items-center justify-center">
                          <UserOutlined className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Add manually</div>
                          <div className="text-xs text-gray-500">Enter a single investor with full details</div>
                        </div>
                      </div>
                    ),
                    onClick: () => router.push('/dashboard/add-investor')
                  },
                  {
                    key: 'upload',
                    label: (
                      <div className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 bg-green-100 rounded flex items-center justify-center">
                          <FileExcelOutlined className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Upload file (CSV/Excel)</div>
                          <div className="text-xs text-gray-500">Bulk import multiple investors at once</div>
                        </div>
                      </div>
                    ),
                    onClick: () => router.push('/dashboard/add-investor')
                  }
                ]
              }}
              placement="bottomRight"
            >
              <Button
                type="primary"
                style={{
                  backgroundColor: "#ac6a1e",
                  color: "#fff",
                }}
                icon={<PlusOutlined />}
              >
                Add Investors
              </Button>
            </Dropdown>
          </Space>
        }
      >


        <div className="mb-6">
          <Search
            placeholder="Search investors by name, email, or focus..."
            allowClear
            enterButton
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              maxWidth: 400,
            }}
            className="custom-search"
          />
        </div>
        
        <style jsx>{`
          :global(.custom-search .ant-btn) {
            background-color: #1890ff !important;
            border-color: #1890ff !important;
            color: white !important;
          }
          :global(.custom-search .ant-btn:hover) {
            background-color: #40a9ff !important;
            border-color: #40a9ff !important;
          }
        `}</style>

        <div className="overflow-x-auto">
          <Table
            columns={finalColumns}
            dataSource={filteredInvestors.slice(0, visibleCount)}
            rowKey={(record) => {
              const id = record.id ?? record._id;
              const email = (record.partner_email ?? '').toString().toLowerCase();
              const name = (record.investor_name ?? '').toString().toLowerCase();
              return `${id ?? 'noid'}-${email || name}`;
            }}
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={false}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">Total: {filteredInvestors.length} investors • Showing {Math.min(visibleCount, filteredInvestors.length)}</div>
            <div className="space-x-2">
              <Button onClick={() => { setUserShowAll(true); setVisibleCount(filteredInvestors.length); }}>All</Button>
              <Button 
                type="primary"
                disabled={visibleCount >= filteredInvestors.length}
                onClick={() => { setUserShowAll(false); setVisibleCount(c => Math.min(c + 10, filteredInvestors.length)); }}
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' }}
              >
                Show more
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* View Investor Modal */}
      <Modal
        title="Investor Details"
        open={viewInvestorModal}
        onCancel={() => setViewInvestorModal(false)}
        footer={<Button onClick={() => setViewInvestorModal(false)}>Close</Button>}
        width={800}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedInvestor && Object.entries({
            'Investor name': (selectedInvestor as any).investor_name,
            'Partner name': (selectedInvestor as any).partner_name,
            'Email': (selectedInvestor as any).partner_email,
            'Phone number': (selectedInvestor as any).phone_number,
            'Fund type': (selectedInvestor as any).fund_type,
            'Fund stage': (selectedInvestor as any).fund_stage,
            'Country': (selectedInvestor as any).country,
            'State': (selectedInvestor as any).state,
            'City': (selectedInvestor as any).city,
            'Ticket size': (selectedInvestor as any).ticket_size,
          }).map(([label, value]) => (
            <div key={label} className="border rounded p-2">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="font-medium break-words">{value || 'N/A'}</div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Edit Investor Modal */}
      <Modal
        title="Edit Investor"
        open={editInvestorModal}
        onCancel={() => { setEditInvestorModal(false); setSelectedInvestor(null); }}
        footer={null}
        width={800}
      >
        <div className="p-2">
          <Form form={form} onFinish={handleEditInvestor} layout="vertical" initialValues={selectedInvestor || {}}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item name="investor_name" label="Investor Name">
                <Input placeholder="Investor Name" />
              </Form.Item>
              <Form.Item name="partner_name" label="Partner Name">
                <Input placeholder="Partner Name" />
              </Form.Item>
              <Form.Item name="partner_email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
                <Input placeholder="Email" />
              </Form.Item>
              <Form.Item name="phone_number" label="Phone Number">
                <Input placeholder="Phone Number" />
              </Form.Item>
              <Form.Item name="fund_type" label="Fund Type">
                <Input placeholder="Fund Type" />
              </Form.Item>
              <Form.Item name="fund_stage" label="Fund Stage">
                <Input placeholder="Fund Stage" />
              </Form.Item>
              <Form.Item name="country" label="Country">
                <Input placeholder="Country" />
              </Form.Item>
              <Form.Item name="state" label="State (Optional)">
                <Input placeholder="State" />
              </Form.Item>
              <Form.Item name="city" label="City (Optional)">
                <Input placeholder="City" />
              </Form.Item>
              <Form.Item name="ticket_size" label="Ticket Size (Optional)">
                <Input placeholder="Ticket Size" />
              </Form.Item>
            </div>
            <div className="flex gap-3 mt-2">
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' }}>Save</Button>
              <Button onClick={() => { setEditInvestorModal(false); setSelectedInvestor(null); }}>Cancel</Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Add Investor Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Button type="text" icon={<SettingOutlined />} size="small">
              Customize Columns
            </Button>
          </div>
        }
        open={addInvestorModal}
        onCancel={() => setAddInvestorModal(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        <div className="p-4">
          {/* Form Headers */}
          <div className="grid grid-cols-4 gap-4 mb-4 font-semibold text-gray-700">
            <div>Partner Email</div>
            <div>Investor Name</div>
            <div>Partner Name</div>
            <div>Fund Focus (Sectors)</div>
          </div>
          
          {/* Form Rows */}
          <Form form={form} onFinish={handleAddInvestor}>
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="grid grid-cols-4 gap-4 mb-4">
                <Form.Item name={`partnerEmail_${row}`}>
                  <Input placeholder="Partner Email" />
                </Form.Item>
                <Form.Item name={`investorName_${row}`}>
                  <Input placeholder="Investor Name" />
                </Form.Item>
                <Form.Item name={`partnerName_${row}`}>
                  <Input placeholder="Partner Name" />
                </Form.Item>
                <Form.Item name={`fundFocus_${row}`}>
                  <Input placeholder="Fund Focus" />
                </Form.Item>
              </div>
            ))}
            
            {/* Add more field button */}
            <div className="text-center mb-6">
              <Button type="link" icon={<PlusOutlined />} className="text-blue-500">
                Add more field
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-4">
              <Button 
                type="primary" 
                htmlType="submit"
                style={{
                  backgroundColor: "#ac6a1e",
                  color: "#fff",
                  borderColor: "#ac6a1e"
                }}
              >
                Submit
              </Button>
              <Button 
                onClick={() => setAddInvestorModal(false)}
                style={{
                  borderColor: "#dc2626",
                  color: "#dc2626"
                }}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
}