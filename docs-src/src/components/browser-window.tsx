/**
 *
 * @link https://www.w3schools.com/howto/howto_css_browser_window.asp
 */
export function BrowserWindow(props) {
    const opacity = props.opacity ? props.opacity : 1;

    const styles = {
        '': { 'boxSizing': 'border-box' },
        'container': {
            'border': '1px solid rgb(241 241 241 / ' + opacity * 100 + '%)',
            'borderTopLeftRadius': '7px',
            'borderTopRightRadius': '7px',
            'borderBottomLeftRadius': '3px',
            'borderBottomRightRadius': '3px',
            overflow: 'hidden',
            'backgroundClip': 'padding-box'
        },
        'row': {
            'padding': '10px',
            'background': '#f1f1f1',
            opacity
        },
        'left': {
            'float': 'left',
            'width': '15%'
        },
        'right': {
            marginTop: 3,
            'float': 'left',
            'width': '10%'

        },
        'middle': { 'float': 'left', 'width': '75%' },
        'row_after': { 'content': '""', 'display': 'table', 'clear': 'both' },
        'dot': {
            'marginTop': '4px',
            marginRight: 2,
            'height': '12px', 'width': '12px',
            'backgroundColor': '#bbb',
            'borderRadius': '50%',
            'display': 'inline-block'
        },
        'input_type_text': {
            'width': '100%',
            'borderRadius': '3px',
            'border': 'none',
            'backgroundColor': 'white',
            'marginTop': '-8px',
            'height': '25px',
            'color': '#666',
            'padding': '5px'
        },
        'bar': {
            'width': '17px', 'height': '3px',
            'backgroundColor': '#aaa',
            'margin': '3px 0',
            'display': 'block'
        },
        'content': {
            'padding': '10px',
            'backgroundColor': 'var(--bg-color)',
            'minWidth': 335
        },
        input: {
            backgroundColor: 'white',
            borderRadius: 4,
            borderWidth: 1,
            paddingTop: 3
        }
    } as any;

    return <div style={styles.container}>
        <div style={styles.row}>
            <div style={{ ...styles.column, ...styles.left }}>
                <span style={{ ...styles.dot, ...{ background: '#ED594A' } }}></span>
                <span style={{ ...styles.dot, ...{ background: '#FDD800' } }} ></span>
                <span style={{ ...styles.dot, ...{ background: '#5AC05A' } }} ></span>
            </div>
            <div style={{ ...styles.column, ...styles.middle }}>
                <input type="text" value="" disabled style={styles.input} />
            </div>
            <div style={{ ...styles.column, ...styles.right }}>
                <div style={{ float: 'right' }}>
                    <span style={styles.bar}></span>
                    <span style={styles.bar}></span>
                    <span style={styles.bar}></span>
                </div>
            </div>
            <div className='clear'></div>
        </div >

        <div style={styles.content}>
            {props.children}
        </div>
    </div>;
}
