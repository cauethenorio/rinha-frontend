import { StartPage } from './start-page';
import { JsonTreePage } from './json-tree-page';

function runApp() {
  const startPage = new StartPage();
  const treePage = new JsonTreePage();

  startPage.onSelectFile(file => {
    if (!file) {
      startPage.setError('');
      return;
    }

    return treePage
      .loadJsonFile(file, {
        onValidFile: startPage.hidePage,
      })
      .catch(err => {
        if ('type' in err && err.type === 'invalid-file') {
          return startPage.setError(err.message);
        }
        throw err;
      });
  });
}

runApp();
