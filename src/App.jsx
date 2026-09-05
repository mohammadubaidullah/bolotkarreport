import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function App() {
  const [activeTab, setActiveTab] = useState('report'); // 'report' or 'view'

  // Form States
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [description, setDescription] = useState('');
  const [perpetrator, setPerpetrator] = useState('');
  const [madrasaName, setMadrasaName] = useState('');
  const [madrasaAddress, setMadrasaAddress] = useState('');
  const [madrasaType, setMadrasaType] = useState('কওমি');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data View & Filter States
  const [reports, setReports] = useState([]);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterUpazila, setFilterUpazila] = useState('');
  const [filterMadrasaType, setFilterMadrasaType] = useState('');
  const [fetching, setFetching] = useState(false);

  // ইমেজ প্রিভিউ প্রসেস
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ডাটাবেজ থেকে রিপোর্ট ফেচ করা
  const fetchReports = async () => {
    setFetching(true);
    try {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports: ", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'view') {
      fetchReports();
    }
  }, [activeTab]);

  // ফর্ম সাবমিশন
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!district || !upazila || !description) {
      alert("অনুগ্রহ করে জেলা, উপজেলা এবং ঘটনার বিবরণ দিন।");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        const imageRef = ref(storage, `reports/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "reports"), {
        district: district.trim(),
        upazila: upazila.trim(),
        description: description,
        perpetrator: perpetrator || "অজ্ঞাত",
        madrasaName: madrasaName || "উল্লেখ করা হয়নি",
        madrasaAddress: madrasaAddress || "উল্লেখ করা হয়নি",
        madrasaType: madrasaType,
        imageUrl: imageUrl,
        createdAt: serverTimestamp()
      });

      alert("আপনার রিপোর্টটি গোপনীয়তার সাথে সফলভাবে নিবন্ধিত হয়েছে।");
      setDistrict('');
      setUpazila('');
      setDescription('');
      setPerpetrator('');
      setMadrasaName('');
      setMadrasaAddress('');
      setMadrasaType('কওমি');
      setImageFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error adding report: ", error);
      alert("রিপোর্ট সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // ফিল্টারিং
  const filteredReports = reports.filter(item => {
    const matchDistrict = filterDistrict === '' || item.district?.toLowerCase().includes(filterDistrict.toLowerCase());
    const matchUpazila = filterUpazila === '' || item.upazila?.toLowerCase().includes(filterUpazila.toLowerCase());
    const matchMadrasaType = filterMadrasaType === '' || item.madrasaType === filterMadrasaType;
    return matchDistrict && matchUpazila && matchMadrasaType;
  });

  return (
    <div style={styles.bodyWrapper}>
      <div style={styles.glowBg}></div>

      <div style={styles.mainContainer}>
        {/* Header */}
        <header style={styles.navHeader}>
          <div style={styles.brandGroup}>
            <div style={styles.logoBadge}>🛡️</div>
            <div>
              <h1 style={styles.brandTitle}>সুরক্ষা পোর্টাল</h1>
              <p style={styles.brandTagline}>বেনামী বলাৎকার রিপোর্টিং ও তথ্য সেবা</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = "https://www.google.com"}
            style={styles.emergencyBtn}
          >
            <span>Quick Exit</span> ✖
          </button>
        </header>

        {/* Tab Switcher */}
        <div style={styles.tabNav}>
          <button 
            style={activeTab === 'report' ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveTab('report')}
          >
            ✍️ নতুন রিপোর্ট দিন
          </button>
          <button 
            style={activeTab === 'view' ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveTab('view')}
          >
            📊 আর্কাইভ ও ফিল্টার ({reports.length})
          </button>
        </div>

        {/* TAB 1: FORM SECTION */}
        {activeTab === 'report' && (
          <div style={styles.glassCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardHeading}>রিপোর্ট তথ্য ইনপুট করুন</h2>
              <span style={styles.anonBadge}>🔒 ১০০% পরিচয় গোপনীয়</span>
            </div>

            <form onSubmit={handleSubmit} style={styles.formGrid}>
              <div style={styles.rowTwoCol}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>জেলা <span style={styles.req}>*</span></label>
                  <input 
                    type="text" 
                    value={district} 
                    onChange={(e) => setDistrict(e.target.value)} 
                    placeholder="যেমন: ঢাকা"
                    style={styles.modernInput}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>উপজেলা <span style={styles.req}>*</span></label>
                  <input 
                    type="text" 
                    value={upazila} 
                    onChange={(e) => setUpazila(e.target.value)} 
                    placeholder="যেমন: সাভার"
                    style={styles.modernInput}
                  />
                </div>
              </div>

              {/* মাদ্রাসার তথ্য ফিল্ডসমূহ */}
              <div style={styles.rowTwoCol}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>মাদ্রাসার নাম (জানা থাকলে)</label>
                  <input 
                    type="text" 
                    value={madrasaName} 
                    onChange={(e) => setMadrasaName(e.target.value)} 
                    placeholder="যেমন: জামিয়া কোরআনিয়া মাদ্রাসা"
                    style={styles.modernInput}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>মাদ্রাসার ধরণ</label>
                  <select 
                    value={madrasaType} 
                    onChange={(e) => setMadrasaType(e.target.value)} 
                    style={styles.modernSelect}
                  >
                    <option value="কওমি">কওমি</option>
                    <option value="হেফজখানা">হেফজখানা</option>
                    <option value="আলিয়া">আলিয়া</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>মাদ্রাসার ঠিকানা/অবস্থান (জানা থাকলে)</label>
                <input 
                  type="text" 
                  value={madrasaAddress} 
                  onChange={(e) => setMadrasaAddress(e.target.value)} 
                  placeholder="যেমন: রোড নং ৪, ব্লক বি, সাভার"
                  style={styles.modernInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>অপরাধীর নাম বা পরিচিতি (জানা থাকলে)</label>
                <input 
                  type="text" 
                  value={perpetrator} 
                  onChange={(e) => setPerpetrator(e.target.value)} 
                  placeholder="যেমন: শিক্ষকের নাম বা পদবী"
                  style={styles.modernInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>ঘটনার সংক্ষিপ্ত বিবরণ <span style={styles.req}>*</span></label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows="4" 
                  placeholder="ঘটনার বিবরণ ও সময় বিস্তারিত লিখুন..."
                  style={styles.modernTextarea}
                ></textarea>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>অপরাধীর ছবি আপলোড (ঐচ্ছিক)</label>
                <div style={styles.fileUploadArea}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" style={styles.fileLabel}>
                    📁 {imageFile ? imageFile.name : "ছবি সিলেক্ট করতে এখানে ক্লিক করুন"}
                  </label>
                </div>
                {previewUrl && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={previewUrl} alt="Preview" style={styles.previewImage} />
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={loading ? styles.submitBtnDisabled : styles.submitBtn}
              >
                {loading ? 'তথ্য এনক্রিপ্ট হয়ে জমা হচ্ছে...' : 'নিরাপদে রিপোর্ট জমা দিন 🚀'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: DATA & FILTER SECTION */}
        {activeTab === 'view' && (
          <div>
            {/* Filter Bar */}
            <div style={styles.filterBox}>
              <h3 style={styles.filterTitle}>🔍 এলাকা ও মাদ্রাসা ভিত্তিক ফিল্টারিং</h3>
              <div style={styles.rowThreeCol}>
                <input 
                  type="text" 
                  value={filterDistrict} 
                  onChange={(e) => setFilterDistrict(e.target.value)} 
                  placeholder="জেলা..."
                  style={styles.modernInput}
                />
                <input 
                  type="text" 
                  value={filterUpazila} 
                  onChange={(e) => setFilterUpazila(e.target.value)} 
                  placeholder="উপজেলা..."
                  style={styles.modernInput}
                />
                <select 
                  value={filterMadrasaType} 
                  onChange={(e) => setFilterMadrasaType(e.target.value)} 
                  style={styles.modernSelect}
                >
                  <option value="">সকল ধরণ</option>
                  <option value="কওমি">কওমি</option>
                  <option value="হেফজখানা">হেফজখানা</option>
                  <option value="আলিয়া">আলিয়া</option>
                  <option value="অন্যান্য">অন্যান্য</option>
                </select>
              </div>
            </div>

            {/* Reports Feed */}
            {fetching ? (
              <div style={styles.loadingContainer}>
                <p>ডাটা লোড করা হচ্ছে...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ margin: 0 }}>কোনো রিপোর্ট পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div style={styles.cardsGrid}>
                {filteredReports.map((report) => (
                  <div key={report.id} style={styles.dataCard}>
                    <div style={styles.dataCardHeader}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={styles.locationTag}>📍 {report.district}, {report.upazila}</span>
                        <span style={styles.typeBadge}>🕌 {report.madrasaType || 'কওমি'}</span>
                      </div>
                      <span style={styles.dateStamp}>
                        {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString('bn-BD') : 'সাম্প্রতিক'}
                      </span>
                    </div>

                    <div style={styles.dataCardBody}>
                      {report.imageUrl && (
                        <img 
                          src={report.imageUrl} 
                          alt="অপরাধী" 
                          style={styles.perpImage} 
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={styles.perpName}>
                          অপরাধী: <span style={{ color: '#ef4444' }}>{report.perpetrator}</span>
                        </div>
                        <div style={styles.madrasaInfoText}>
                          🏫 মাদ্রাসা: {report.madrasaName} ({report.madrasaAddress})
                        </div>
                        <p style={styles.descText}>{report.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Style Configuration
const styles = {
  bodyWrapper: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
    padding: '20px 12px',
    position: 'relative',
    overflowX: 'hidden'
  },
  glowBg: {
    position: 'absolute',
    top: '-10%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(225,29,72,0.15) 0%, rgba(15,23,42,0) 70%)',
    pointerEvents: 'none'
  },
  mainContainer: { maxWidth: '750px', margin: '0 auto', position: 'relative', zIndex: 10 },
  navHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoBadge: { width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #e11d48, #9f1239)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)' },
  brandTitle: { fontSize: '20px', fontWeight: '700', margin: 0, color: '#fff' },
  brandTagline: { fontSize: '12px', color: '#94a3b8', margin: 0 },
  emergencyBtn: { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  tabNav: { display: 'flex', gap: '10px', background: 'rgba(30, 41, 59, 0.7)', padding: '6px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' },
  tabActive: { flex: 1, padding: '12px', border: 'none', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: '#fff', fontWeight: '600', borderRadius: '8px', cursor: 'pointer' },
  tabInactive: { flex: 1, padding: '12px', border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: '600', borderRadius: '8px', cursor: 'pointer' },
  glassCard: { background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  cardHeading: { fontSize: '18px', margin: 0, fontWeight: '600' },
  anonBadge: { fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  rowTwoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  rowThreeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#cbd5e1', fontWeight: '500' },
  req: { color: '#ef4444' },
  modernInput: { width: '100%', padding: '12px 14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  modernSelect: { width: '100%', padding: '12px 14px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  modernTextarea: { width: '100%', padding: '12px 14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  fileUploadArea: { border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', padding: '14px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.3)' },
  fileLabel: { cursor: 'pointer', color: '#38bdf8', fontSize: '13px' },
  previewImage: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '10px' },
  submitBtnDisabled: { width: '100%', padding: '14px', background: '#475569', color: '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'not-allowed', marginTop: '10px' },
  filterBox: { background: 'rgba(30, 41, 59, 0.5)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' },
  filterTitle: { margin: '0 0 12px 0', fontSize: '14px', color: '#94a3b8' },
  cardsGrid: { display: 'flex', flexDirection: 'column', gap: '14px' },
  dataCard: { background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' },
  dataCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  locationTag: { background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  typeBadge: { background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  dateStamp: { fontSize: '12px', color: '#64748b' },
  dataCardBody: { display: 'flex', gap: '14px' },
  perpImage: { width: '85px', height: '85px', objectFit: 'cover', borderRadius: '8px' },
  perpName: { fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: '#f1f5f9' },
  madrasaInfoText: { fontSize: '12px', color: '#fbbf24', marginBottom: '8px' },
  descText: { fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 },
  loadingContainer: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
  emptyCard: { textAlign: 'center', padding: '30px', background: 'rgba(30,41,59,0.3)', borderRadius: '12px', color: '#64748b' }
};

export default App;