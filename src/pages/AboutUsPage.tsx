// src/pages/AboutUsPage.tsx
import { motion } from 'framer-motion';
import { Globe, Phone, Code, Smartphone, Monitor } from 'lucide-react';

export default function AboutUsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8 sm:p-12">
        
        {/* Logo Section */}
        <div className="flex justify-center mb-10">
          <img src="/tg.svg" alt="Logo" className="h-20 object-contain" />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">Tranzix Global Impex</h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            We are a premier technology solutions provider specializing in cutting-edge software engineering, custom website design, and comprehensive mobile app development. Our mission is to build digital solutions that elevate businesses to the next level.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <Monitor className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="font-bold text-slate-800">Website Development</h3>
            <p className="text-xs text-slate-500 mt-2">Modern, responsive, and robust web applications.</p>
          </div>
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <Smartphone className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="font-bold text-slate-800">App Development</h3>
            <p className="text-xs text-slate-500 mt-2">Intuitive and powerful iOS & Android applications.</p>
          </div>
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <Code className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="font-bold text-slate-800">Software Solutions</h3>
            <p className="text-xs text-slate-500 mt-2">Custom-engineered enterprise software systems.</p>
          </div>
        </div>

        {/* Contact Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-semibold">
          <a href="tel:+94702175757" className="flex items-center gap-2.5 text-slate-700 hover:text-indigo-600 bg-white px-5 py-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm">
            <Phone className="w-4 h-4 text-indigo-500" /> +94 70 217 5757
          </a>
          <a href="https://tranzixglobalimpex.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-slate-700 hover:text-indigo-600 bg-white px-5 py-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm">
            <Globe className="w-4 h-4 text-indigo-500" /> tranzixglobalimpex.com
          </a>
        </div>

      </div>
    </motion.div>
  );
}