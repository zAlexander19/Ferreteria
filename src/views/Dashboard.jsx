import React from 'react';
import { InventoryTable } from '../components/InventoryTable';
import { LayoutDashboard, Settings } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
             <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Ferretería "El Constructor"</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
           <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm border border-blue-200">
            AD
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
           <div>
            <h2 className="text-2xl font-bold text-gray-900">Panel de Gerente</h2>
            <p className="text-gray-500 mt-1">Gestión general de inventario y productos.</p>
           </div>
           <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-gray-600 capitalize">
             {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
        </div>
        
        <InventoryTable />
      </main>
    </div>
  );
}
