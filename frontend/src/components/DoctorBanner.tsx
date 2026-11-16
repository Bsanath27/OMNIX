import React, { useEffect, useState } from 'react';
import { fetchDoctor, DoctorReport } from '../api';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export const DoctorBanner: React.FC = () => {
  const [report, setReport] = useState<DoctorReport | null>(null);

  useEffect(() => {
    fetchDoctor()
      .then(setReport)
      .catch(() => null);
  }, []);

  if (!report) return null;

  return (
    <div className="bg-slate-950/40 backdrop-blur-xl border-b border-white/[0.08] px-6 py-2.5 text-xs flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-300">{report.app_name} v{report.app_version} System Health:</span>
        <span className={`px-2 py-0.5 rounded-full font-medium border ${
          report.status === 'ok' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {report.status.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {Object.entries(report.components).map(([name, comp]) => {
          return (
            <div key={name} className="flex items-center gap-1.5" title={comp.message}>
              {comp.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {comp.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
              {comp.status === 'missing' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
              {comp.status === 'info' && <Info className="w-3.5 h-3.5 text-slate-400" />}
              <span className="capitalize text-slate-400 font-medium">{name.replace('_', ' ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
