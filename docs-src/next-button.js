
function runAddingNextButtons() {
    function addNextButton() {
        var id = 'rxdb-custom-next-button';

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





var callToActions = [
    {
        text: 'Follow at ',
        keyword: '@twitter',
        url: 'https://twitter.com/intent/user?screen_name=rxdbjs'
    },
    {
        text: 'Chat at ',
        keyword: '@discord',
        url: 'https://discord.gg/tqt9ZttJfD'
    },
    {
        text: 'Star at ',
        keyword: '@github',
        url: 'https://github.com/pubkey/rxdb'
    },
    {
        text: 'Subscribe',
        keyword: '@newsletter',
        url: 'http://eepurl.com/imD7WA'
    }
];
function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
var callToActionButtonId = 'rxdb-call-to-action-button';
function setCallToActionOnce() {
    var randId = new Date().getTime() % callToActions.length;
    var callToAction = callToActions[randId];
    var alreadyThere = document.querySelector('#' + callToActionButtonId);
    if (alreadyThere) {
        alreadyThere.parentNode.removeChild(alreadyThere);
    }


    var positionReferenceElement = document.querySelector('.btn.pull-left.js-toolbar-action');
    if (!positionReferenceElement) {
        // not loaded yet!
        return;
    }

    var newElement = document.createElement('a');
    newElement.classList.add('btn');
    newElement.classList.add('pull-left');
    newElement.classList.add('js-toolbar-action');
    newElement.id = callToActionButtonId;
    newElement.innerHTML = callToAction.text + ' <b>' + callToAction.keyword + '</b>';
    newElement.href = callToAction.url;
    newElement.target = '_blank';


    insertAfter(positionReferenceElement, newElement);
}
function runSettingCallToActionButton() {
    setCallToActionOnce();
    /**
     * Gitbook does a strange page change handling,
     * so we have to re-run the function
     * because listening to history changes did not work.
     */
    setInterval(function () {
        var alreadyThere = document.querySelector('#' + callToActionButtonId);
        // only add if not exists already, like on a page change.
        if (!alreadyThere) {
            setCallToActionOnce();
        }
    }, 100);
}
runSettingCallToActionButton();
