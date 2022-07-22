
function addNextButton() {

    var block = document.querySelector('.normal.markdown-section');
    var currentNext = document.querySelector('a.navigation.navigation-next');
    console.dir(currentNext);
    console.dir(block);

    if (currentNext) {
        var path = window.location.pathname;
        var page = path.split('/').pop();
        console.log('page: ' + page);

        var chapters = document.querySelectorAll('.chapter');
        var dataPaths = [];
        chapters.forEach(function (chapter) {
            var dataPath = chapter.dataset.path;
            dataPaths.push(dataPath);
        });

        var lastIndex = dataPaths.lastIndexOf(page);
        var nextPath = dataPaths[lastIndex + 1];
        console.log('nexdtPath: ' + nextPath);
        if (!nextPath) {
            return;
        }

        var hr = document.createElement('hr');
        block.appendChild(hr);

        console.log('# Add next button');
        var span = document.createElement('p');
        span.innerHTML = 'If you are new to RxDB, you should continue ';
        var link = document.createElement('a');
        link.href = nextPath;
        link.innerHTML = 'here';
        span.appendChild(link);
        block.appendChild(span);
    }
}

addNextButton();
