import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import './App.css';

// ===== ভ্যালিডেশন হেল্পার =====
const NAME_REGEX = /^[\u0980-\u09FFa-zA-Z\s]*$/; // বাংলা + ইংরেজি অক্ষর + স্পেস
const ADDRESS_REGEX = /^[\u0980-\u09FFa-zA-Z0-9\s,./-]*$/; // অক্ষর + সংখ্যা + সাধারণ চিহ্ন

function App() {
  const [activeTab, setActiveTab] = useState('report');

  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [description, setDescription] = useState('');
  const [perpetrator, setPerpetrator] = useState('');
  const [madrasaName, setMadrasaName] = useState('');
  const [madrasaAddress, setMadrasaAddress] = useState('');
  const [madrasaType, setMadrasaType] = useState('কওমি');
  const [loading, setLoading] = useState(false);

  // প্রতিটা ফিল্ডের এরর মেসেজ রাখার জন্য
  const [errors, setErrors] = useState({});

  const [reports, setReports] = useState([]);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterUpazila, setFilterUpazila] = useState('');
  const [filterMadrasaType, setFilterMadrasaType] = useState('');
  const [fetching, setFetching] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchReports = async () => {
    setFetching(true);
    try {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports: ", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      document.body.style.overflow = 'hidden';
      const onKey = (e) => {
        if (e.key === 'Escape') setSelectedReport(null);
      };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    }
  }, [selectedReport]);

  const typeCounts = useMemo(() => {
    const counts = { 'কওমি': 0, 'হেফজখানা': 0, 'অন্যান্য': 0 };
    reports.forEach((r) => {
      const t = r.madrasaType === 'আলিয়া' ? 'অন্যান্য' : r.madrasaType;
      if (counts[t] !== undefined) {
        counts[t] += 1;
      } else {
        counts['অন্যান্য'] += 1;
      }
    });
    return counts;
  }, [reports]);

  // ===== ইনপুট পরিবর্তনের সময় রিয়েল-টাইম ফিল্টারিং =====
  // শুধু নির্ধারিত ক্যারেক্টার লিখতে দেবে, বাকি সব বাদ দেবে
  const handleNameInput = (setter, maxLen) => (e) => {
    const val = e.target.value;
    if (val.length > maxLen) return;
    if (NAME_REGEX.test(val)) {
      setter(val);
    }
    // regex এ না মিললে (যেমন সংখ্যা/চিহ্ন) কিছুই সেট হবে না, তাই ইনপুট নেওয়া হবে না
  };

  const handleAddressInput = (e) => {
    const val = e.target.value;
    if (val.length > 200) return;
    if (ADDRESS_REGEX.test(val)) {
      setMadrasaAddress(val);
    }
  };

  const handleDescriptionInput = (e) => {
    const val = e.target.value;
    if (val.length > 2000) return; // অতিরিক্ত বড় ডাটা ঠেকানোর জন্য
    setDescription(val);
  };

  // ===== সাবমিটের আগে চূড়ান্ত ভ্যালিডেশন =====
  const validateForm = () => {
    const newErrors = {};

    if (!district.trim()) {
      newErrors.district = 'জেলা লিখুন';
    } else if (!NAME_REGEX.test(district)) {
      newErrors.district = 'শুধু অক্ষর ব্যবহার করুন';
    }

    if (!upazila.trim()) {
      newErrors.upazila = 'উপজেলা লিখুন';
    } else if (!NAME_REGEX.test(upazila)) {
      newErrors.upazila = 'শুধু অক্ষর ব্যবহার করুন';
    }

    if (perpetrator && !NAME_REGEX.test(perpetrator)) {
      newErrors.perpetrator = 'শুধু অক্ষর ব্যবহার করুন';
    }

    if (madrasaName && !NAME_REGEX.test(madrasaName)) {
      newErrors.madrasaName = 'শুধু অক্ষর ব্যবহার করুন';
    }

    if (madrasaAddress && !ADDRESS_REGEX.test(madrasaAddress)) {
      newErrors.madrasaAddress = 'অবৈধ ক্যারেক্টার ব্যবহৃত হয়েছে';
    }

    if (!description.trim()) {
      newErrors.description = 'ঘটনার বিবরণ লিখুন';
    } else if (description.trim().length < 10) {
      newErrors.description = 'কমপক্ষে ১০ অক্ষর লিখুন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'অনুগ্রহ করে চিহ্নিত ভুলগুলো ঠিক করুন।');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "reports"), {
        district: district.trim(),
        upazila: upazila.trim(),
        description: description.trim(),
        perpetrator: perpetrator.trim() || "অজ্ঞাত",
        madrasaName: madrasaName.trim() || "উল্লেখ করা হয়নি",
        madrasaAddress: madrasaAddress.trim() || "উল্লেখ করা হয়নি",
        madrasaType: madrasaType,
        createdAt: serverTimestamp(),
      });

      showToast('success', 'আপনার রিপোর্টটি গোপনীয়তার সাথে সফলভাবে নিবন্ধিত হয়েছে।');
      setDistrict('');
      setUpazila('');
      setDescription('');
      setPerpetrator('');
      setMadrasaName('');
      setMadrasaAddress('');
      setMadrasaType('কওমি');
      setErrors({});
      fetchReports();
    } catch (error) {
      console.error("Error adding report: ", error);
      showToast('error', 'রিপোর্ট সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((item) => {
    const matchDistrict =
      filterDistrict === '' ||
      item.district?.toLowerCase().includes(filterDistrict.toLowerCase());
    const matchUpazila =
      filterUpazila === '' ||
      item.upazila?.toLowerCase().includes(filterUpazila.toLowerCase());
    const matchMadrasaType =
      filterMadrasaType === '' || item.madrasaType === filterMadrasaType;
    return matchDistrict && matchUpazila && matchMadrasaType;
  });

  return (
    <div className="app-shell">
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast--success' : 'toast--error'}`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <header className="app-header">
        <div className="brand-group">
          <div className="logo-badge">🛡️</div>
          <div>
            <h1 className="brand-title">বলাৎকার রিপোর্ট</h1>
            <p className="brand-tagline brand-tagline--alert">বেনামী বলাৎকার রিপোর্টিং ও তথ্য সেবা</p>
          </div>
        </div>
        <button
          onClick={() => (window.location.href = "https://www.google.com")}
          className="exit-btn"
        >
          <span>Quick Exit</span> ✖
        </button>
      </header>

      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'report' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          ✍️ নতুন রিপোর্ট দিন
        </button>
        <button
          className={`tab-btn ${activeTab === 'view' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          📊 আর্কাইভ ও ফিল্টার ({reports.length})
        </button>
      </div>

      {activeTab === 'report' && (
        <>
          <div className="stats-row">
            <div className="stat-circle stat-circle--qawmi">
              <span className="stat-number">{typeCounts['কওমি']}</span>
              <span className="stat-label">কওমি</span>
            </div>
            <div className="stat-circle stat-circle--hifz">
              <span className="stat-number">{typeCounts['হেফজখানা']}</span>
              <span className="stat-label">হাফেজি</span>
            </div>
            <div className="stat-circle stat-circle--other">
              <span className="stat-number">{typeCounts['অন্যান্য']}</span>
              <span className="stat-label">অন্যান্য</span>
            </div>
            <div className="stat-circle stat-circle--total">
              <span className="stat-number">{reports.length}</span>
              <span className="stat-label">মোট</span>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header">
              <h2 className="card-heading">রিপোর্ট তথ্য ইনপুট করুন</h2>
              <span className="anon-badge">🔒 ১০০% পরিচয় গোপনীয়</span>
            </div>

            <form onSubmit={handleSubmit} className="form-grid" noValidate>
              <div className="row-2">
                <div className="field">
                  <label className="field-label">
                    জেলা <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={handleNameInput(setDistrict, 50)}
                    placeholder="যেমন: ঢাকা"
                    className={`field-input ${errors.district ? 'field-input--error' : ''}`}
                  />
                  {errors.district && <span className="field-error">{errors.district}</span>}
                </div>
                <div className="field">
                  <label className="field-label">
                    উপজেলা <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={upazila}
                    onChange={handleNameInput(setUpazila, 50)}
                    placeholder="যেমন: সাভার"
                    className={`field-input ${errors.upazila ? 'field-input--error' : ''}`}
                  />
                  {errors.upazila && <span className="field-error">{errors.upazila}</span>}
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label className="field-label">মাদ্রাসার নাম (জানা থাকলে)</label>
                  <input
                    type="text"
                    value={madrasaName}
                    onChange={handleNameInput(setMadrasaName, 100)}
                    placeholder="যেমন: জামিয়া কোরআনিয়া মাদ্রাসা"
                    className={`field-input ${errors.madrasaName ? 'field-input--error' : ''}`}
                  />
                  {errors.madrasaName && <span className="field-error">{errors.madrasaName}</span>}
                </div>
                <div className="field">
                  <label className="field-label">মাদ্রাসার ধরণ</label>
                  <select
                    value={madrasaType}
                    onChange={(e) => setMadrasaType(e.target.value)}
                    className="field-select"
                  >
                    <option value="কওমি">কওমি</option>
                    <option value="হেফজখানা">হাফেজি</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label">মাদ্রাসার ঠিকানা/অবস্থান (জানা থাকলে)</label>
                <input
                  type="text"
                  value={madrasaAddress}
                  onChange={handleAddressInput}
                  placeholder="যেমন: রোড নং ৪, ব্লক বি, সাভার"
                  className={`field-input ${errors.madrasaAddress ? 'field-input--error' : ''}`}
                />
                {errors.madrasaAddress && <span className="field-error">{errors.madrasaAddress}</span>}
              </div>

              <div className="field">
                <label className="field-label">অপরাধীর নাম বা পরিচিতি (জানা থাকলে)</label>
                <input
                  type="text"
                  value={perpetrator}
                  onChange={handleNameInput(setPerpetrator, 100)}
                  placeholder="যেমন: শিক্ষকের নাম বা পদবী"
                  className={`field-input ${errors.perpetrator ? 'field-input--error' : ''}`}
                />
                {errors.perpetrator && <span className="field-error">{errors.perpetrator}</span>}
              </div>

              <div className="field">
                <label className="field-label">
                  ঘটনার সংক্ষিপ্ত বিবরণ <span className="req">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={handleDescriptionInput}
                  rows="4"
                  placeholder="ঘটনার বিবরণ ও সময় বিস্তারিত লিখুন..."
                  className={`field-textarea ${errors.description ? 'field-input--error' : ''}`}
                ></textarea>
                <div className="char-count">{description.length}/2000</div>
                {errors.description && <span className="field-error">{errors.description}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={loading ? 'submit-btn--disabled' : 'submit-btn'}
              >
                {loading && <span className="spinner"></span>}
                {loading ? 'তথ্য এনক্রিপ্ট হয়ে জমা হচ্ছে...' : 'নিরাপদে রিপোর্ট জমা দিন 🚀'}
              </button>
            </form>
          </div>
        </>
      )}

      {activeTab === 'view' && (
        <div>
          <div className="filter-box">
            <h3 className="filter-title">🔍 এলাকা ও মাদ্রাসা ভিত্তিক ফিল্টারিং</h3>
            <div className="row-3">
              <input
                type="text"
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                placeholder="জেলা..."
                className="field-input"
              />
              <input
                type="text"
                value={filterUpazila}
                onChange={(e) => setFilterUpazila(e.target.value)}
                placeholder="উপজেলা..."
                className="field-input"
              />
              <select
                value={filterMadrasaType}
                onChange={(e) => setFilterMadrasaType(e.target.value)}
                className="field-select"
              >
                <option value="">সকল ধরণ</option>
                <option value="কওমি">কওমি</option>
                <option value="হেফজখানা">হাফেজি</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </select>
            </div>
          </div>

          {fetching ? (
            <div className="state-box">ডাটা লোড করা হচ্ছে...</div>
          ) : filteredReports.length === 0 ? (
            <div className="state-box">কোনো রিপোর্ট পাওয়া যায়নি।</div>
          ) : (
            <div className="cards-grid cards-grid--compact">
              {filteredReports.map((report) => (
                <button
                  key={report.id}
                  className="data-card data-card--compact"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="compact-left">
                    <div className="tag-group">
                      <span className="tag tag--location">
                        📍 {report.district}, {report.upazila}
                      </span>
                      <span className="tag tag--type">
                        🕌 {report.madrasaType === 'হেফজখানা' ? 'হাফেজি' : (report.madrasaType || 'কওমি')}
                      </span>
                    </div>
                    <div className="compact-name">
                      অপরাধী: <span>{report.perpetrator}</span>
                    </div>
                  </div>
                  <div className="compact-right">
                    <span className="date-stamp">
                      {report.createdAt?.toDate
                        ? report.createdAt.toDate().toLocaleDateString('bn-BD')
                        : 'সাম্প্রতিক'}
                    </span>
                    <span className="chevron">›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedReport && (
        <div className="detail-overlay" onClick={() => setSelectedReport(null)}>
          <div className="detail-page" onClick={(e) => e.stopPropagation()}>
            <div className="detail-topbar">
              <button className="back-btn" onClick={() => setSelectedReport(null)}>
                ‹ ফিরে যান
              </button>
              <span className="date-stamp">
                {selectedReport.createdAt?.toDate
                  ? selectedReport.createdAt.toDate().toLocaleDateString('bn-BD')
                  : 'সাম্প্রতিক'}
              </span>
            </div>

            <div className="detail-body">
              <div className="tag-group">
                <span className="tag tag--location">
                  📍 {selectedReport.district}, {selectedReport.upazila}
                </span>
                <span className="tag tag--type">
                  🕌 {selectedReport.madrasaType === 'হেফজখানা' ? 'হাফেজি' : (selectedReport.madrasaType || 'কওমি')}
                </span>
              </div>

              <h2 className="detail-heading">
                অপরাধী: <span>{selectedReport.perpetrator}</span>
              </h2>

              <div className="detail-section">
                <div className="detail-label">🏫 মাদ্রাসার নাম</div>
                <div className="detail-value">{selectedReport.madrasaName}</div>
              </div>

              <div className="detail-section">
                <div className="detail-label">📍 মাদ্রাসার ঠিকানা</div>
                <div className="detail-value">{selectedReport.madrasaAddress}</div>
              </div>

              <div className="detail-section">
                <div className="detail-label">📝 ঘটনার বিবরণ</div>
                <p className="detail-desc">{selectedReport.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;