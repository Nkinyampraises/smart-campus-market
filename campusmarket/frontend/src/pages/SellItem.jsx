import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_SUGGESTIONS = {
  Textbooks:   { min: 5000,   max: 36000  },
  Electronics: { min: 60000,  max: 300000 },
  Housing:     { min: 30000,  max: 120000 },
  Clothing:    { min: 5000,   max: 30000  },
  Services:    { min: 10000,  max: 60000  },
  Accessories: { min: 5000,   max: 50000  },
};

const CONDITIONS = ['New / Unopened', 'Excellent Condition', 'Good Condition', 'Used', 'For Parts'];

const CAMPUS_ZONES = [
  { id: 'north-quad',    label: 'North Quad',   icon: 'security'       },
  { id: 'main-library',  label: 'Main Library', icon: 'local_library'  },
  { id: 'dining-hall',   label: 'Dining Hall',  icon: 'restaurant'     },
  { id: 'student-union', label: 'Student Union',icon: 'groups'         },
  { id: 'rec-center',    label: 'Rec Center',   icon: 'sports_soccer'  },
  { id: 'dorm-area',     label: 'Dorm Area',    icon: 'home'           },
];

const DEFAULT_IMAGES = {
  Textbooks:   'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=300&fit=crop',
  Electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
  Housing:     'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
  Clothing:    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=300&fit=crop',
  Services:    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
  Accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
};

const formatFCFA = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const saveListing = (form, previews) => {
  const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
  const newItem = {
    id: Date.now(),
    title: form.title,
    category: form.category,
    subcategory: form.category,
    priceFCFA: Number(form.price),
    price: Number(form.price),
    condition: form.condition,
    description: form.description,
    campusZone: form.campusZone,
    status: 'Active',
    views: 0,
    saves: 0,
    inquiries: 0,
    postedAgo: 'Just now',
    image: previews[0] || DEFAULT_IMAGES[form.category] || DEFAULT_IMAGES.Textbooks,
    images: previews.length
      ? previews
      : [DEFAULT_IMAGES[form.category] || DEFAULT_IMAGES.Textbooks],
    location: CAMPUS_ZONES.find((z) => z.id === form.campusZone)?.label || 'Campus',
    seller: { name: 'You', initials: 'ME', color: '#ff6b1a', rating: 5.0, reviews: 0 },
    createdAt: Date.now(),
  };
  localStorage.setItem('campustrade_listings', JSON.stringify([newItem, ...stored]));
};

const SellItem = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Textbooks',
    condition: 'New / Unopened',
    price: '',
    campusZone: 'north-quad',
  });
  const [previews, setPreviews] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState({});

  const suggestion = CATEGORY_SUGGESTIONS[form.category] || CATEGORY_SUGGESTIONS.Textbooks;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleFiles = (files) => {
    const newPreviews = Array.from(files)
      .slice(0, 8 - previews.length)
      .map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 8));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Product title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Enter a valid price';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (step === 1) navigate(-1);
    else setStep((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const handlePublish = () => {
    saveListing(form, previews);
    setPublished(true);
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-12">
      {[
        { n: 1, label: 'LISTING DETAILS' },
        { n: 2, label: 'MEDIA & LOCATION' },
        { n: 3, label: 'REVIEW' },
      ].map(({ n, label }, i, arr) => (
        <React.Fragment key={n}>
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[16px] transition-all ${
                step >= n
                  ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {n}
            </div>
            <span
              className={`text-[11px] font-black tracking-widest whitespace-nowrap ${
                step === n ? 'text-[#ff6b1a]' : step > n ? 'text-gray-500' : 'text-gray-300'
              }`}
            >
              {label}
            </span>
          </div>
          {i < arr.length - 1 && (
            <div
              className={`h-0.5 w-32 mb-5 transition-all ${
                step > n ? 'bg-[#ff6b1a]' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  if (published) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
        <Nav navigate={navigate} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-emerald-500 text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h2 className="text-[32px] font-black text-[#1b1c1c] mb-3">Listing Published!</h2>
            <p className="text-[#5c5f60] mb-8">
              <span className="font-bold text-[#1b1c1c]">{form.title}</span> is now live on CampusTrade.
              Students near you can see it right away.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/my-listings')}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[#1b1c1c] hover:bg-gray-50 transition-all"
              >
                View My Listings
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
      <Nav navigate={navigate} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <StepIndicator />

        {/* ── STEP 1: Listing Details ── */}
        {step === 1 && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-[20px] font-black text-[#1b1c1c] mb-6">Listing Details</h2>

              {/* Title */}
              <div className="mb-5">
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Product Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Organic Chemistry Textbook 10th Ed"
                  className={`w-full px-4 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${
                    errors.title ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-[12px] mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the item condition, use, and any flaws..."
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all resize-none ${
                    errors.description ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.description && <p className="text-red-500 text-[12px] mt-1">{errors.description}</p>}
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {Object.keys(CATEGORY_SUGGESTIONS).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                    Condition
                  </label>
                  <div className="relative">
                    <select
                      value={form.condition}
                      onChange={(e) => handleChange('condition', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Price (FCFA)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[14px]">
                    FCFA
                  </span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="0"
                    className={`w-full pl-16 pr-4 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${
                      errors.price ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.price && <p className="text-red-500 text-[12px] mt-1">{errors.price}</p>}
              </div>

              {/* AI Suggestion */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">auto_awesome</span>
                  <p className="font-black text-[14px] text-[#1b1c1c]">AI Price Suggestion</p>
                </div>
                <p className="text-[13px] text-gray-600 mb-4">
                  Based on similar {form.category.toLowerCase()} listings in your campus area, we suggest a price
                  between{' '}
                  <span className="text-[#ff6b1a] font-bold">{formatFCFA(suggestion.min)}</span> –{' '}
                  <span className="text-[#ff6b1a] font-bold">{formatFCFA(suggestion.max)}</span> for a faster sale.
                </p>
                <button
                  onClick={() => handleChange('price', suggestion.min)}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Apply Suggestion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Media & Location ── */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left — Listing Details recap */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 flex flex-col gap-5">
              <h2 className="text-[18px] font-black text-[#1b1c1c]">Listing Details</h2>

              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Product Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Organic Chemistry Textbook 10th Ed"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the item condition, use, and any flaws..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {Object.keys(CATEGORY_SUGGESTIONS).map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                    Condition
                  </label>
                  <div className="relative">
                    <select
                      value={form.condition}
                      onChange={(e) => handleChange('condition', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Price (FCFA)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[14px]">FCFA</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="0"
                    className="w-full pl-16 pr-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                  />
                </div>
              </div>

              {/* AI Suggestion */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">auto_awesome</span>
                  <p className="font-black text-[14px] text-[#1b1c1c]">AI Price Suggestion</p>
                </div>
                <p className="text-[13px] text-gray-600 mb-4">
                  Based on similar {form.category.toLowerCase()} listings in your campus area, we suggest a price
                  between{' '}
                  <span className="text-[#ff6b1a] font-bold">{formatFCFA(suggestion.min)}</span> –{' '}
                  <span className="text-[#ff6b1a] font-bold">{formatFCFA(suggestion.max)}</span> for a faster sale.
                </p>
                <button
                  onClick={() => handleChange('price', suggestion.min)}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Apply Suggestion
                </button>
              </div>
            </div>

            {/* Right — Media & Campus Zone */}
            <div className="flex flex-col gap-5">
              {/* Images */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                <h2 className="text-[18px] font-black text-[#1b1c1c] mb-5">Images</h2>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current.click()}
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-10 cursor-pointer transition-all mb-4 ${
                    dragOver ? 'border-[#ff6b1a] bg-orange-50' : 'border-orange-200 bg-orange-50/40 hover:bg-orange-50'
                  }`}
                >
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[#ff6b1a] text-[28px]">add_a_photo</span>
                  </div>
                  <p className="font-black text-[15px] text-[#1b1c1c] mb-1">Upload Photos</p>
                  <p className="text-[13px] text-gray-400">Drag and drop or click to browse.</p>
                  <p className="text-[13px] text-gray-400">Add up to 8 photos.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center relative"
                    >
                      {previews[i] ? (
                        <>
                          <img src={previews[i]} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setPreviews((p) => p.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-white text-[12px]">close</span>
                          </button>
                        </>
                      ) : (
                        <span className="material-symbols-outlined text-gray-300 text-[24px]">image</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Campus Zone */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                <h2 className="text-[18px] font-black text-[#1b1c1c] mb-1">Campus Zone</h2>
                <p className="text-[13px] text-gray-400 mb-5">
                  Select the preferred meeting areas for the trade.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {CAMPUS_ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => handleChange('campusZone', zone.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-[13px] font-semibold transition-all ${
                        form.campusZone === zone.id
                          ? 'border-[#ff6b1a] text-[#ff6b1a] bg-orange-50'
                          : 'border-gray-100 text-gray-600 hover:border-gray-200'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: form.campusZone === zone.id ? '#ff6b1a' : '#9ca3af' }}
                      >
                        {zone.icon}
                      </span>
                      {zone.label}
                    </button>
                  ))}
                </div>

                {/* Map */}
                <div className="relative rounded-xl overflow-hidden" style={{ height: '160px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop&grayscale"
                    alt="Campus map"
                    className="w-full h-full object-cover"
                    style={{ filter: 'grayscale(100%) contrast(0.9)' }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-4">
                    <button className="flex items-center gap-2 bg-[#ff6b1a] text-white px-5 py-2.5 rounded-full font-bold text-[13px] hover:shadow-lg transition-all">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      VIEW MAP DETAIL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-5">
              <h2 className="text-[20px] font-black text-[#1b1c1c] mb-6">Review Your Listing</h2>

              {/* Image preview */}
              {previews.length > 0 && (
                <div className="mb-6 rounded-xl overflow-hidden" style={{ height: '220px' }}>
                  <img src={previews[0]} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              {previews.length === 0 && (
                <div className="mb-6 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center" style={{ height: '120px' }}>
                  <div className="text-center text-gray-400">
                    <span className="material-symbols-outlined text-[36px]">image</span>
                    <p className="text-[13px]">No photos added — a default image will be used</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {[
                  { label: 'Title', value: form.title },
                  { label: 'Category', value: form.category },
                  { label: 'Condition', value: form.condition },
                  { label: 'Price', value: formatFCFA(form.price || 0) },
                  { label: 'Meeting Zone', value: CAMPUS_ZONES.find((z) => z.id === form.campusZone)?.label },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-3 border-b border-gray-50">
                    <span className="text-[12px] font-black tracking-widest text-gray-400 uppercase">{label}</span>
                    <span className="text-[14px] font-bold text-[#1b1c1c] text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="py-3">
                  <p className="text-[12px] font-black tracking-widest text-gray-400 uppercase mb-2">Description</p>
                  <p className="text-[14px] text-gray-600 leading-relaxed">{form.description}</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-[20px] mt-0.5">info</span>
              <p className="text-[13px] text-gray-600">
                By publishing, your listing will be visible to all students on CampusTrade. You can edit or remove it anytime from <span className="font-bold">My Listings</span>.
              </p>
            </div>
          </div>
        )}

        {/* ── Bottom Action Bar ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => { saveListing(form, previews); navigate('/my-listings'); }}
            className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
          >
            SAVE AS DRAFT
          </button>
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
            >
              BACK
            </button>
            {step < 3 ? (
              <button
                onClick={goNext}
                className="px-8 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95"
              >
                {step === 1 ? 'NEXT: MEDIA & LOCATION' : 'CONTINUE TO REVIEW'}
              </button>
            ) : (
              <button
                onClick={handlePublish}
                className="px-8 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">publish</span>
                PUBLISH LISTING
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const Nav = ({ navigate }) => (
  <header className="bg-white border-b border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <h1
          className="text-2xl font-black tracking-tighter text-[#ff6b1a] cursor-pointer"
          onClick={() => navigate('/')}
        >
          CampusTrade
        </h1>
        <nav className="hidden md:flex items-center gap-6">
          <a onClick={() => navigate('/browse')} href="#" className="text-gray-600 font-medium hover:text-[#ff6b1a] no-underline text-[15px]">
            Marketplace
          </a>
          <a href="#" className="text-gray-600 font-medium hover:text-[#ff6b1a] no-underline text-[15px]">
            Categories
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-[#f6f3f2] rounded-full px-4 py-2 w-64">
          <span className="material-symbols-outlined text-[#5c5f60] mr-2 text-[18px]">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-[14px] w-full outline-none" placeholder="Search campus..." type="text" />
        </div>
        <button className="p-2 hover:bg-gray-50 rounded-full"><span className="material-symbols-outlined text-[#5c5f60]">notifications</span></button>
        <button className="p-2 hover:bg-gray-50 rounded-full"><span className="material-symbols-outlined text-[#5c5f60]">shopping_cart</span></button>
        <div className="w-9 h-9 rounded-full bg-[#ff6b1a] flex items-center justify-center text-white font-black text-[13px]">ME</div>
      </div>
    </div>
  </header>
);

export default SellItem;
