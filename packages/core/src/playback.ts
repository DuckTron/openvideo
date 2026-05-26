export class PlaybackController {
  constructor(private store: any) {}

  public play() {
    const state = this.store.getState();
    if (state.isPlaying) return;
    this.store.getState().setIsPlaying(true);
  }

  public pause() {
    this.store.getState().setIsPlaying(false);
  }

  public toggle() {
    if (this.store.getState().isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(timeUs: number) {
    this.store.getState().seek(timeUs);
  }
}
