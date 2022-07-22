
function runAddingNextButtons() {


    function addNextButton() {
        var id = 'rxdb-custon-next-button';

        var alreadyThere = document.querySelector('#' + id);
        if (alreadyThere) {
            return;
        }
        console.log('custom next button NOT already there.');


        var block = document.querySelector('.normal.markdown-section');
        console.dir(block);

        var path = window.location.pathname;
        var page = path.split('/').pop();
        console.log('page: ' + page);

        var chapters = document.querySelectorAll('.chapter');
        var dataPaths = [];
        chapters.forEach(function (chapter) {
            var dataPath = chapter.dataset.path;
            if (dataPath) {
                dataPaths.push(dataPath);
            }
        });

        var lastIndex = dataPaths.lastIndexOf(page);
        console.dir('dataPaths:');
        console.dir(dataPaths);
        var nextPath = dataPaths[lastIndex + 1];
        console.log('nexdtPath: ' + nextPath);
        if (!nextPath) {
            return;
        }

        var hr = document.createElement('hr');
        block.appendChild(hr);

        console.log('# Add next button');
        var span = document.createElement('p');
        span.id = id;
        span.innerHTML = 'If you are new to RxDB, you should continue ';
        var link = document.createElement('a');
        link.href = nextPath;
        link.innerHTML = 'here';
        span.appendChild(link);
        block.appendChild(span);
    }

    addNextButton();

    /**
     * Gitbook does a strange page change handling,
     * so we have to re-run the function
     * because listening to history changes did not work.
     */
    setInterval(function () {
        addNextButton();
    }, 100);

}
runAddingNextButtons();
