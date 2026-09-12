import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('عنصر الجذر غير موجود');

createRoot(container).render(
  <StrictMode>
    {/* HashRouter: يعمل على أي استضافة ثابتة بلا إعدادات خادم، ويحافظ على المسار
        عند إعادة الفتح من الشاشة الرئيسية */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
