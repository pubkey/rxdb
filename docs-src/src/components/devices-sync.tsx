import { SemPage } from '../pages';

export function DevicesSync(_props: {
    sem?: SemPage;
}) {

    return (
        <>
            <div className="content-canvas">
                <div
                    className="device tablet"
                    style={{ marginLeft: 481, marginTop: 117 }}
                >
                    <div className="beating-color">
                        {/* {
                            props.sem ? <>
                                <img src={props.sem.iconUrl} style={{
                                    height: 23,
                                    width: 23,
                                    position: 'absolute',
                                    marginLeft: -83, marginTop: 95, zIndex: 2,
                                    backgroundColor: 'white',
                                    padding: 2,
                                    borderRadius: '50%'
                                }}
                                    alt={props.sem.metaTitle}></img>
                            </> : <></>
                        } */}
                        <img
                            src="/files/logo/logo.svg"
                            className="beating logo"
                            alt="RxDB"
                        />
                    </div>
                </div>
                <div className="device desktop" style={{ marginTop: '0%' }}>
                    <div className="beating-color">
                        {/* {
                            props.sem ? <>
                                <img src={props.sem.iconUrl} style={{
                                    height: 30,
                                    width: 30,
                                    position: 'absolute', marginLeft: -224, marginTop: 104, zIndex: 2,
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    padding: 2,

                                }}
                                    alt={props.sem.metaTitle}></img>
                            </> : <></>
                        } */}
                        <img
                            src="/files/logo/logo_text.svg"
                            className="beating logo"
                            alt="RxDB"
                        />
                    </div>
                </div>
                <div
                    className="device server"
                    style={{ marginLeft: 0, marginTop: 168 }}
                >
                    <div className="beating-color one"></div>
                    <div className="beating-color two"></div>
                    <div className="beating-color three"></div>
                </div>
                {/* <div class="left third centered">
                  <img
                      src="/files/logo/logo.svg"
                      class="beating logo"
                      alt="RxDB"
                  />
              </div>
              <div
                  class="third centered left"
                  style="padding-left: 0px;"
              >
                  <img
                      src="/files/icons/arrows/left-arrow.svg"
                      alt="left"
                      class="beating-first arrow"
                  />
                  <img
                      src="/files/icons/arrows/right-arrow.svg"
                      alt="right"
                      class="beating-second arrow arrow-right"
                  />
              </div>
              <div class="right third centered">
                  <div class="smartphone">
                      <div class="smartphone-color beating-color"></div>
                  </div>
              </div> */}
            </div>
        </>
    );
}
