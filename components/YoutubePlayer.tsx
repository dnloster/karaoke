import {
    ArrowUturnLeftIcon,
    ForwardIcon,
    PauseIcon,
    PlayIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
} from "@heroicons/react/20/solid";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFullscreen, usePromise, useToggle } from "react-use";
import YouTube, { YouTubePlayer } from "react-youtube";
import { useKaraokeState } from "../hooks/karaoke";

let secondScreen = null;

function YoutubePlayer({ videoId, nextSong, className = "", extra = null }) {
    const {
        playlist,
        // curVideoId,
        // searchTerm,
        // isKaraoke,
        // activeIndex,
        // setPlaylist,
        // setCurVideoId,
        // setSearchTerm,
        // setIsKaraoke,
        // setActiveIndex,
    } = useKaraokeState();
    const playerRef = useRef<YouTube>();
    const fullscreenRef = useRef<HTMLDivElement>();
    const [show, toggleFullscreen] = useToggle(false);
    const isFullscreen = useFullscreen(fullscreenRef, show, {
        onClose: () => toggleFullscreen(false),
    });
    const [playerState, setPlayerState] = useState<number>();
    const [showMarquee, setShowMarquee] = useState(false);

    const [isMuted, setIsMuted] = useState(false);
    const mounted = usePromise();

    const openSecondScreen = () => {
        secondScreen = window.open("", "SecondScreen", "width=1920,height=1080");
        secondScreen.document.write(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Video Display</title>
                <script src="https://www.youtube.com/iframe_api"></script>
                <style>
                    body {
                        margin: 0;
                        background: black;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                    }
                    #player {
                        width: 100%;
                        height: 100%;
                    }
                </style>
            </head>
            <body style="margin: 0; overflow: hidden; background-color: black;">
                <div id="player"></div>

                <script>
                    let player;
                    window.addEventListener("message", (event) => {
                        // Chỉ nhận thông điệp từ cùng một origin
                        if (event.origin !== window.location.origin) return;

                        const { type, videoId, state, currentTime } = event.data;

                        if (type === "INIT_VIDEO") {
                            loadVideo(videoId);
                        }

                        if (type === "SYNC_STATE") {
                            syncPlayerState(state);
                        }

                        if (type === "SYNC_TIME") {
                            syncVideoTime(currentTime);
                        }
                    });

                    // Khởi tạo video trên màn hình phụ
                    function loadVideo(videoId) {
                        if (player) {
                            player.loadVideoById(videoId);
                        } else {
                            player = new YT.Player("player", {
                                videoId: videoId,
                                playerVars: {
                                    autoplay: 1,
                                    controls: 0, // Không hiển thị điều khiển
                                    modestbranding: 1,
                                    mute: 1, // Tắt tiếng
                                },
                            });
                        }
                    }

                    window.addEventListener("message", (event) => {
                        const { type, videoId } = event.data;

                        if (type === "INIT_VIDEO" && player) {
                            console.log("Playing video ID:", videoId);
                            player.loadVideoById(videoId);
                        }
                    });

                    // Gửi thông điệp "READY" về cửa sổ chính
                    window.opener.postMessage({ type: "READY" }, window.opener.location.origin);

                    // Đồng bộ trạng thái video (play/pause)
                    function syncPlayerState(state) {
                        if (!player) return;
                        if (state === YT.PlayerState.PLAYING) {
                            player.playVideo();
                        } else if (state === YT.PlayerState.PAUSED) {
                            player.pauseVideo();
                        }
                    }

                    // Đồng bộ thời gian video
                    function syncVideoTime(time) {
                        if (player) {
                            player.seekTo(time, true);
                        }
                    }
                </script>

                
            </body>
            </html>`
        );
        secondScreen.document.close();
        secondScreen.postMessage({ type: "INIT_VIDEO", videoId }, "*");
    };

    const playOnSecondScreen = () => {
        if (secondScreen && !secondScreen.closed) {
            secondScreen.postMessage({ type: "INIT_VIDEO", videoId }, window.location.origin);
        } else {
            openSecondScreen();
        }
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === "READY" && secondScreen) {
                console.log("Second screen is ready");
                secondScreen.postMessage({ type: "INIT_VIDEO", videoId }, window.location.origin);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [secondScreen, videoId]);

    // Đồng bộ video với màn hình thứ hai (trạng thái và thời gian)
    const syncVideoWithSecondScreen = () => {
        const player = playerRef.current?.getInternalPlayer();
        if (secondScreen && !secondScreen.closed && player) {
            player.getPlayerState().then((state) => secondScreen.postMessage({ type: "SYNC_STATE", state }, "*"));

            player
                .getCurrentTime()
                .then((currentTime) => secondScreen.postMessage({ type: "SYNC_TIME", currentTime }, "*"));
        }
    };

    useEffect(() => {
        const player = playerRef.current?.getInternalPlayer();
        if (player) {
            updatePlayerState(player);
        }

        // Khi videoId thay đổi, thông báo cho cửa sổ phụ
        if (secondScreen && !secondScreen.closed) {
            secondScreen.postMessage({ type: "INIT_VIDEO", videoId }, "*");
        }
    }, [videoId]);

    async function updatePlayerState(player: YouTubePlayer) {
        if (!player) return;
        const [muteState, playerState] = await mounted(Promise.allSettled([player.isMuted(), player.getPlayerState()]));
        // These lines will not execute if this component gets unmounted.
        if (muteState.status === "fulfilled") setIsMuted(muteState.value);
        if (playerState.status === "fulfilled") setPlayerState(playerState.value);
        syncVideoWithSecondScreen();
    }

    useEffect(() => {
        const player = playerRef.current?.getInternalPlayer();
        if (player) updatePlayerState(player);
    }, [videoId]);

    useEffect(() => {
        const interval = setInterval(syncVideoWithSecondScreen, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setShowMarquee(true);
            setTimeout(() => setShowMarquee(false), 20000);
        }, 50000);

        return () => clearInterval(interval); // Dọn dẹp interval
    }, []);

    const playPauseBtn = useMemo(
        () => [
            playerState === YouTube.PlayerState.PLAYING
                ? {
                      icon: PauseIcon,
                      label: "Dừng",
                      onClick: async () => {
                          try {
                              const player = playerRef.current?.getInternalPlayer();
                              if (!player) return;
                              setPlayerState(await player.getPlayerState());
                              await player.pauseVideo();
                          } catch (error) {
                              console.log(error);
                          }
                      },
                  }
                : {
                      icon: PlayIcon,
                      label: "Phát",
                      onClick: async () => {
                          try {
                              const player = playerRef.current?.getInternalPlayer();
                              if (!player) return;
                              setPlayerState(await player?.getPlayerState());
                              await player?.playVideo();
                          } catch (error) {
                              console.log(error);
                          }
                      },
                  },
        ],
        [playerState]
    );
    const muteBtn = useMemo(
        () => [
            !isMuted
                ? {
                      icon: SpeakerWaveIcon,
                      label: "Tắt tiếng",
                      onClick: async () => {
                          try {
                              const player = playerRef.current?.getInternalPlayer();
                              if (!player) return;
                              await player.mute();
                              setIsMuted(true);
                          } catch (error) {
                              console.log(error);
                          }
                      },
                  }
                : {
                      icon: SpeakerXMarkIcon,
                      label: "Mở tiếng",
                      onClick: async () => {
                          try {
                              const player = playerRef.current?.getInternalPlayer();
                              if (!player) return;
                              await player.unMute();
                              setIsMuted(false);
                          } catch (error) {
                              console.log(error);
                          }
                      },
                  },
        ],
        [isMuted]
    );

    const playerBtns = useMemo(
        () => [
            {
                icon: ForwardIcon,
                label: "Qua bài",
                onClick: nextSong,
            },
            {
                icon: ArrowUturnLeftIcon,
                label: "Hát lại",
                onClick: async () => {
                    try {
                        const player = playerRef.current?.getInternalPlayer();
                        if (!player) return;
                        await player.seekTo(0, true);
                    } catch (error) {
                        console.log(error);
                    }
                },
            },
        ],
        [nextSong]
    );

    return (
        <div
            ref={fullscreenRef}
            id="youtubePlayer"
            className={`${isFullscreen ? "bg-black" : "bg-white"} ${className}`}
        >
            <div className="w-full aspect-video relative flex-1 md:flex-grow-1" onClick={toggleFullscreen}>
                {!videoId ? (
                    <div className="h-full w-full flex items-center justify-center bg-black">
                        <Image src="/assets/icons/icon.svg" width={48} height={48} className="" alt="KaraTube's Logo" />
                    </div>
                ) : (
                    <>
                        <YouTube
                            ref={playerRef}
                            videoId={videoId}
                            className={`w-full bg-black ${
                                !isFullscreen ? "aspect-video cursor-zoom-in" : "h-full cursor-zoom-out"
                            }`}
                            iframeClassName={`w-full h-full pointer-events-none`}
                            style={{ width: "100%", height: "100%" }}
                            loading="lazy"
                            opts={{
                                playerVars: {
                                    autoplay: 1,
                                    controls: 0,
                                    disablekb: 1,
                                    enablejsapi: 1,
                                    modestbranding: 1,
                                    playsinline: 1,
                                    iv_load_policy: 3, // Disable annotations
                                },
                            }}
                            onStateChange={(ev) => updatePlayerState(ev.target)}
                            onEnd={nextSong}
                        />
                        {playlist.length && showMarquee && (
                            <div
                                className={`absolute bottom-10 left-0 w-full text-yellow-400 p-2 rounded-md animate-marquee whitespace-nowrap text-shadow-black ${
                                    !isFullscreen ? "texl-lg" : "text-6xl"
                                }`}
                            >
                                Bài tiếp theo: {playlist[0].title}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex-shrink-0 flex flex-row md:w-full p-1 items-center">
                {playPauseBtn.concat(playerBtns, muteBtn).map((btn) => (
                    <button
                        key={btn.label}
                        className="btn btn-ghost text-primary flex h-auto flex-col flex-1 overflow-hidden text-[10px] 2xl:text-lg p-0 hover:bg-base-200"
                        onClick={btn.onClick}
                    >
                        <btn.icon className="w-10 h-10" />
                        {btn.label}
                    </button>
                ))}
                <button onClick={playOnSecondScreen} className="btn">
                    Mở màn hình phụ
                </button>
                {extra}
            </div>
        </div>
    );
}

export default YoutubePlayer;
