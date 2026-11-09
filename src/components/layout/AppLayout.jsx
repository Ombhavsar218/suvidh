import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopNavbar } from './TopNavbar';
import { ToastContainer } from '../common/ToastContainer';
import { Modal } from '../common/Modal';
import { SecondaryButton } from '../common/Buttons';
import { useApp } from '../../context/AppContext';
import { ROLE_DESCRIPTIONS } from '../../utils/permissions';

export function AppLayout({ children }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { activeRole } = useApp();

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onOpenHelp={() => setHelpOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      <ToastContainer />

      <Modal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Suvidh ERP — Frontend Demo Guide"
        subtitle="Manufacturing & Production Management System (LocalStorage Persistence)"
        footer={<SecondaryButton onClick={() => setHelpOpen(false)}>Close</SecondaryButton>}
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <p className="font-semibold text-blue-900 dark:text-blue-200">
              Local Frontend Simulation Mode
            </p>
            <p className="mt-1 text-blue-800 dark:text-blue-300">
              All records and mutations are stored locally in browser LocalStorage via a
              service layer structured for future Django REST Framework integration.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
              Key Manufacturing Rules Implemented
            </h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Raw Material Usable Stock:</strong> Only quality-approved stock counts
                as usable; reserved material is excluded from available unreserved quantity.
              </li>
              <li>
                <strong>Production Priority Score:</strong> Weighted 40% Delivery Urgency,
                25% Customer Priority, 20% Material Readiness, 15% Machine Efficiency.
              </li>
              <li>
                <strong>Capacity & Compatibility Checks:</strong> Production plans validate
                machine/product compatibility and block silent capacity overload.
              </li>
              <li>
                <strong>Finished Goods Integrity:</strong> Only QC-accepted units add to
                usable finished goods inventory.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Active Demo Role: {activeRole}
            </h4>
            <p>{ROLE_DESCRIPTIONS[activeRole]}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Note: Frontend role switching is for UI demonstration only; production access
              controls must be enforced by the backend API.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
