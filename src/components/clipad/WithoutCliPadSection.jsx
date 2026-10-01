import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, MessageSquare, FileText, Video, RefreshCw, XCircle, Clock } from 'lucide-react';

export default function WithoutCliPadSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Copy Side */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">The Old Way</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
            The chaos of <br className="hidden md:block"/>
            <span className="text-rose-500">disconnected tools.</span>
          </h2>
          <p className="text-slate-500 text-lg md:text-xl leading-relaxed mb-8">
            When your company's knowledge is scattered across Skype chats, lost meeting recordings, and buried Google Docs, productivity grinds to a halt.
          </p>
          
          <div className="space-y-6">
            {[
              { icon: MessageSquare, title: 'App Fatigue', desc: 'Constantly switching between 5 different apps just to find one piece of information.' },
              { icon: FileText, title: 'No Organizational Memory', desc: 'When employees leave, their context and decisions leave with them.' },
              { icon: Clock, title: 'Lost Context', desc: 'Spending hours searching for that one recording or document link in a noisy chat channel.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                  <p className="text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Side: The Chaos */}
        <div className="relative h-[500px] w-full bg-slate-100 rounded-3xl border border-slate-200 shadow-inner overflow-hidden flex items-center justify-center">
          
          {/* Ambient chaotic background */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          {/* Main central broken window */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="absolute z-10 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="h-8 bg-slate-100 flex items-center px-3 gap-1.5 border-b border-slate-200">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3 items-start opacity-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-blue-500" /></div>
                <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none text-xs text-slate-600">Where is the recording from yesterday?</div>
              </div>
              <div className="flex gap-3 items-start flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                <div className="bg-blue-500 p-3 rounded-lg rounded-tr-none text-xs text-white">I think Sarah has it on her hard drive...</div>
              </div>
              <div className="flex gap-3 items-start opacity-50">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><FileText className="w-4 h-4 text-emerald-500" /></div>
                <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none text-xs text-slate-600">The doc link expired. Can someone re-share?</div>
              </div>
            </div>
          </motion.div>

          {/* Floating error / alert windows */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 left-12 bg-white p-3 rounded-lg shadow-xl border border-rose-100 flex items-center gap-3 z-20"
          >
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="text-xs font-bold text-slate-700">Access Denied</span>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 right-10 bg-white p-3 rounded-lg shadow-xl border border-slate-200 flex items-center gap-3 z-20"
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Syncing Failed</span>
          </motion.div>

          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-16 w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center z-0"
          >
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">14</div>
            <Video className="w-8 h-8 text-slate-300" />
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [2, -2, 2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-16 left-16 w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center z-0"
          >
            <XCircle className="w-8 h-8 text-rose-300" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
