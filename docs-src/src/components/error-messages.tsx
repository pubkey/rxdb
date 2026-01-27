import { ucfirst } from '../../../src/plugins/utils/utils-string';
import { ERROR_MESSAGES } from '../../../src/plugins/dev-mode/error-messages';
import { useLocation } from '@docusaurus/router';
const errorEntries = Object.entries(ERROR_MESSAGES);

export function ErrorMessages() {
    const location = useLocation();
    console.dir(ERROR_MESSAGES);
    const styles = {
        '': { 'boxSizing': 'border-box' },
        ul: {
            listStyleType: 'none'
        },
        'li': {
            borderStyle: 'solid',
            borderWidth: 1,
            height: 'auto',
            borderColor: 'var(--color-top)',
            padding: 32,
            borderRadius: 14,
            backgroundColor: 'var(--bg-color-dark)',
            justifyContent: 'space-between',
            gap: 48,
            margin: 10,
            marginBottom: 20
        },
        liHighlight: {
            boxShadow: '2px 2px 13px var(--color-top), -2px -1px 14px var(--color-top)'
        },
        errorCode: {
            fontSize: '1.3em',
            lineHeight: '130%',
            margin: '0 0 8px',
        },
        innerUl: {
            marginTop: 14,
        },
    } as any;

    return <ul style={styles.ul}>
        {
            errorEntries.map(([errorCode, errorMessage]) => {
                return <li
                    key={errorCode}
                    id={errorCode}
                    style={location.hash === '#' + errorCode ? { ...styles.li, ...styles.liHighlight } : styles.li}
                >
                    <h6 style={styles.errorCode}>
                        <a href={'#' + errorCode} style={{ textDecoration: 'none', color: 'inherit' }}>
                            #{errorCode}
                        </a>
                    </h6>
                    <div style={{ marginBottom: 18 }}>
                        {ucfirst(errorMessage.message)}
                    </div>
                    {
                        errorMessage.cause &&
                        <div style={{ marginBottom: 18 }}>
                            <b>Cause:</b><br />
                            {errorMessage.cause}
                        </div>
                    }
                    {
                        errorMessage.fix &&
                        <div style={{ marginBottom: 18 }}>
                            <b>Fix:</b><br />
                            {errorMessage.fix}
                        </div>
                    }
                    {
                        errorMessage.docs &&
                        <div style={{ marginBottom: 18 }}>
                            <b>Docs:</b><br />
                            <a href={errorMessage.docs} target="_blank">{errorMessage.docs}</a>
                        </div>
                    }


                    <div style={{ marginBottom: 18 }}>
                        <ul style={{ paddingLeft: 20 }}>
                            <li>
                                <a href={'https://github.com/pubkey/rxdb/search?q=' + errorCode + '&type=code'} target="_blank">Search In Code</a>
                            </li>
                            <li>
                                <a href={'https://github.com/pubkey/rxdb/search?q=' + errorCode + '&type=issues'} target="_blank">Search In Issues</a>
                            </li>
                        </ul>
                    </div>
                </li>;
            })
        }
    </ul>;
}
