import logo from './logo.svg';
import { BrowserRouter as Router, Route } from "react-router-dom";
import Menu from './components/Menu'
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <div className='container'>
        <Menu />
        <div className='rightContent'>
          <Route path="/" exact component={Home} />
        </div>
      </div>
    </Router>
  );
}

export default App;
