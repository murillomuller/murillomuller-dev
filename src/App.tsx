import { useTranslation } from "react-i18next";
import { BrowserRouter as Router, Route } from "react-router-dom";
import Menu from './components/Menu'
import Home from './pages/Home';

function App() {
  const {t} = useTranslation('common');
  return (
    <Router>
      <div className='container'>
        <Menu />
        <div className='rightContent'>
          <Route path="/" exact component={Home} />
          <Route path="/:language" component={Home} />
        </div>
        <footer><span>{t('footer.developed')}</span>{t('footer.description')} <a href='https://github.com/murillomuller/murillomuller-dev' target='_blank' rel="noreferrer" >{t('footer.righthere')}</a></footer>
      </div>
    </Router>
  );
}

export default App;
