
function runAddingNextButtons() {
    function addNextButton() {
        var id = 'rxdb-custon-next-button';

        var alreadyThere = document.querySelector('#' + id);
        if (alreadyThere) {
            return;
        }

        var block = document.querySelector('.normal.markdown-section');

        var path = window.location.pathname;
        var page = path.split('/').pop();

        var chapters = document.querySelectorAll('.chapter');
        var dataPaths = [];
        chapters.forEach(function (chapter) {
            var dataPath = chapter.dataset.path;
            if (dataPath) {
                dataPaths.push(dataPath);
            }
        });

        var lastIndex = dataPaths.lastIndexOf(page);
        var nextPath = dataPaths[lastIndex + 1];
        if (!nextPath) {
            return;
        }

        var hr = document.createElement('hr');
        block.appendChild(hr);

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
