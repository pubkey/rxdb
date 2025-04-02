export function Tag(props: {
    img?: string;
    children?: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-color)',
                height: 30,
                padding: '0 8px',
                borderRadius: '50vh',
                textAlign: 'center',
                width: 'auto',
                marginRight: 10,
                marginBottom: 10,
                fontSize: '100%'
            }}
            className='neumorphism-circle-s'
        >
            {props.img && (
                <img
                    src={props.img}
                    loading="lazy"
                    alt=""
                    style={{
                        height: '60%',
                        marginRight: 6, // Spacing between image and text
                    }}
                />
            )}
            {props.children}
        </div>
    );
}
