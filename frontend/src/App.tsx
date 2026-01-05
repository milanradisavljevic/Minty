import { Dashboard } from './components/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Register transparency test utility on window (for console debugging)
import './utils/transparencyTest';

function App() {
  return (
    <>
      <Dashboard />
      <ToastContainer position="bottom-right" theme="dark" newestOnTop closeOnClick />
    </>
  );
}

export default App;
