import { StartPage } from './start-page';
import { TreePage } from './tree-page/tree-page';

function runApp() {
  const startPage = new StartPage();
  const treePage = new TreePage();

  startPage.onSelectFile(file => {
    if (!file) {
      startPage.setError('');
      return Promise.resolve();
    }

    return treePage.loadJsonFile(file);
  });
}

runApp();
