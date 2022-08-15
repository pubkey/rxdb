import { create } from 'react-test-renderer';
import App from './App';

const mockDbRef = { current: null };
const mockSetAppIsReady = jest.fn();

jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useRef: () => mockDbRef,
    useState: initial => [initial, mockSetAppIsReady],
}));

describe('<App />', () => {
    const rendered = create(<App/>).toJSON();

    it('renders without crashing', async () => {
        // wait for database to be asynchronously initialized
        await new Promise(setImmediate);

        expect(rendered).toBeDefined();
    });

    it('initializes the database', () => {
        expect(mockDbRef.current).toBeDefined();
    })

    it('sets the app as ready', () => {
        expect(mockSetAppIsReady).toHaveBeenCalledWith(true);
    })
});
