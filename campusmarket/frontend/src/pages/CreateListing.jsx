import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';

const CATEGORIES = ['Textbooks', 'Electronics', 'Housing', 'Clothing', 'Services', 'Accessories'];
const CONDITIONS = ['New / Unopened', 'Excellent Condition', 'Good Condition', 'Used', 'For Parts'];
const CAMPUS_ZONES = [
  { id: 'engineering', label: 'Engineering Block', icon: 'engineering' },
  { id: 'main-library', label: 'Main Library', icon: 'local_library' },
  { id: 'dining-hall', label: 'Dining Hall', icon: 'restaurant' },
  { id: 'student-union', label: 'Student Union', icon: 'groups' },
  { id: 'rec-center', label: 'Rec Center', icon: 'sports_soccer' },
  { id: 'dorm-area', label: 'Dorm Area', icon: 'home' },
];

const PRICE_SUGGESTIONS = {
  Textbooks: { min: 5000, max: 36000 },
  Electronics: { min: 60000, max: 300000 },
  Housing: { min: 30000, max: 120000 },
  Clothing: { min: 5000, max: 30000 },
  Services: { min: 10000, max: 60000 },
  Accessories: { min: 5000, max: 50000 },
};

const DEFAULT_IMAGES = {
  Textbooks: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=300&fit=crop',
  Electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
  Housing: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
  Clothing: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=300&fit=crop',
  Services: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
  Accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
};

const fmtFCFA = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const CreateListing = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileRef = useRef(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Textbooks',
    condition: 'Good Condition',
    price: '',
    campusZone: 'engineering',
    autoExpire: true,
  });
  const [previews, setPreviews] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const suggestion = PRICE_SUGGESTIONS[form.category];

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleFiles = (files) => {
    const newPreviews = Array.from(files)
      .slice(0, 5 - previews.length)
      .map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Enter a valid price';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveDraft = () => {
    showToast('Draft saved!', 'neutral');
    navigate('/my-listings');
  };

  const handlePublish = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
      const zone = CAMPUS_ZONES.find((z) => z.id === form.campusZone);
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
        image: previews[0] || DEFAULT_IMAGES[form.category],
        images: previews.length ? previews : [DEFAULT_IMAGES[form.category]],
        location: zone?.label || 'Campus',
        seller: { name: 'You', initials: 'ME', color: '#ff6b1a', rating: 5.0, reviews: 0 },
        createdAt: Date.now(),
      };
      localStorage.setItem('campustrade_listings', JSON.stringify([newItem, ...stored]));
      setLoading(false);
      showToast('Listing published successfully!', 'success');
      navigate('/my-listings');
    }, 1000);
  };

  const steps = [
    { n: 1, label: 'DETAILS' },
    { n: 2, label: 'MEDIA & ZONE' },
    { n: 3, label: 'REVIEW' },
  ];

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[15px] transition-all ${
                    step >= n ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {n}
                </div>
                <span className={`text-[10px] font-black tracking-widest ${step === n ? 'text-[#ff6b1a]' : step > n ? 'text-gray-500' : 'text-gray-300'}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-24 mb-5 transition-all ${step > n ? 'bg-[#ff6b1a]' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-[20px] font-black text-[#1b1c1c] mb-6">Listing Details</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="e.g., Organic Chemistry Textbook 10th Ed"
                    className={`w-full px-4 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.title && <p className="text-red-500 text-[12px] mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe the item, condition, any accessories included..."
                    rows={5}
                    className={`w-full px-4 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none ${errors.description ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.description && <p className="text-red-500 text-[12px] mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Category</label>
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) => set('category', e.target.value)}
                        className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Condition</label>
                    <div className="relative">
                      <select
                        value={form.condition}
                        onChange={(e) => set('condition', e.target.value)}
                        className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                      >
                        {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Price (FCFA)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[13px]">FCFA</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                      placeholder="0"
                      className={`w-full pl-16 pr-4 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] ${errors.price ? 'border-red-400' : 'border-gray-200'}`}
                    />
                  </div>
                  {errors.price && <p className="text-red-500 text-[12px] mt-1">{errors.price}</p>}
                </div>
              </div>
            </div>

            {/* AI Suggestion sidebar */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 h-fit">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">auto_awesome</span>
                <p className="font-black text-[15px] text-[#1b1c1c]">AI Price Suggestion</p>
              </div>
              <p className="text-[13px] text-gray-600 mb-1">
                For <span className="font-bold text-[#1b1c1c]">{form.category}</span> in <span className="font-bold text-[#1b1c1c]">{form.condition}</span> condition, the suggested price range is:
              </p>
              <div className="flex items-center gap-2 my-4">
                <span className="text-[#ff6b1a] font-black text-[18px]">{fmtFCFA(suggestion.min)}</span>
                <span className="text-gray-400">–</span>
                <span className="text-[#ff6b1a] font-black text-[18px]">{fmtFCFA(suggestion.max)}</span>
              </div>
              <p className="text-[12px] text-gray-500 mb-4">
                Based on recent campus listings. A lower price means faster sale.
              </p>
              <button
                onClick={() => set('price', suggestion.min)}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-[12px] font-black tracking-widest uppercase hover:bg-emerald-700 transition-all"
              >
                Use Suggested Price
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Media & Zone ── */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Images */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <h2 className="text-[18px] font-black text-[#1b1c1c] mb-5">Photos</h2>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current.click()}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-10 cursor-pointer transition-all mb-4 ${
                  dragOver ? 'border-[#ff6b1a] bg-orange-50' : 'border-orange-200 bg-orange-50/30 hover:bg-orange-50'
                }`}
              >
                <span className="material-symbols-outlined text-[#ff6b1a] text-[40px] mb-2">add_a_photo</span>
                <p className="font-bold text-[14px] text-[#1b1c1c]">Drag & drop or click to browse</p>
                <p className="text-[12px] text-gray-400 mt-1">Up to 5 photos</p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[0,1,2,3,4].map((i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center relative">
                    {previews[i] ? (
                      <>
                        <img src={previews[i]} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviews((p) => p.filter((_, idx) => idx !== i)); }}
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
              <h2 className="text-[18px] font-black text-[#1b1c1c] mb-1">Meetup Zone</h2>
              <p className="text-[13px] text-gray-400 mb-5">Pick the campus spot where you'll hand over the item.</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CAMPUS_ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => set('campusZone', zone.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-[13px] font-semibold transition-all ${
                      form.campusZone === zone.id
                        ? 'border-[#ff6b1a] text-[#ff6b1a] bg-orange-50'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color: form.campusZone === zone.id ? '#ff6b1a' : '#9ca3af' }}>
                      {zone.icon}
                    </span>
                    {zone.label}
                  </button>
                ))}
              </div>

              {/* Auto-expire toggle */}
              <div className="flex items-center justify-between bg-[#fcf9f8] rounded-xl p-4">
                <div>
                  <p className="font-bold text-[14px] text-[#1b1c1c]">Auto-expire after 30 days</p>
                  <p className="text-[12px] text-gray-400">Listing will be removed automatically</p>
                </div>
                <button
                  onClick={() => set('autoExpire', !form.autoExpire)}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.autoExpire ? 'bg-[#ff6b1a]' : 'bg-gray-200'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.autoExpire ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-4">
              <h2 className="text-[20px] font-black text-[#1b1c1c] mb-6">Review Your Listing</h2>
              {previews.length > 0 ? (
                <div className="rounded-xl overflow-hidden mb-6" style={{ height: '220px' }}>
                  <img src={previews[0]} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-6" style={{ height: '140px' }}>
                  <div className="text-center text-gray-400">
                    <span className="material-symbols-outlined text-[36px]">image</span>
                    <p className="text-[13px]">No photos — default image will be used</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {[
                  ['Title', form.title],
                  ['Category', form.category],
                  ['Condition', form.condition],
                  ['Price', fmtFCFA(form.price || 0)],
                  ['Meetup Zone', CAMPUS_ZONES.find((z) => z.id === form.campusZone)?.label || ''],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-3 border-b border-gray-50">
                    <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{label}</span>
                    <span className="text-[14px] font-bold text-[#1b1c1c] text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="py-3">
                  <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Description</p>
                  <p className="text-[14px] text-gray-600 leading-relaxed">{form.description}</p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-[20px] mt-0.5">info</span>
              <p className="text-[13px] text-gray-600">
                By publishing, your listing will be visible to all students on CampusTrade. You can edit or remove it anytime from{' '}
                <span className="font-bold">My Listings</span>.
              </p>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={saveDraft}
            className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[13px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
          >
            Save Draft
          </button>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[13px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => { if (step === 1 && !validate()) return; setStep((s) => s + 1); window.scrollTo(0, 0); }}
                className="px-8 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[13px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95"
              >
                {step === 1 ? 'Next: Media & Zone' : 'Continue to Review'}
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={loading}
                className="px-8 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[13px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? 'Publishing…' : 'Publish Listing'}
                {!loading && <span className="material-symbols-outlined text-[18px]">publish</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListing;
