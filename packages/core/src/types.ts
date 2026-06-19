export interface IDisplay {
  from: number;
  to: number;
}

export interface ITrim {
  from: number;
  to: number;
}

export interface IFlip {
  x: boolean;
  y: boolean;
}

export type ClipType =
  | "Video"
  | "Audio"
  | "Image"
  | "Text"
  | "Transition"
  | "Caption"
  | "Effect"
  | "Shape";

export interface IFade {
  duration: number; // ms
  curve?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface IClipTiming {
  display: IDisplay;
  trim: ITrim;
  duration: number;
  playbackRate: number;
  fadeIn?: IFade;
  fadeOut?: IFade;
}

/** Partial timing for use in add/prepare payloads. loadClip fills in defaults. */
export type IClipTimingInput = Partial<{
  display: Partial<IDisplay>;
  trim: Partial<ITrim>;
  duration: number;
  playbackRate: number;
  fadeIn?: IFade;
  fadeOut?: IFade;
}>;

export interface IClipTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  zIndex: number;
  opacity: number;
  flip?: IFlip | null;
}

export interface IBaseClip {
  id: string;
  type: ClipType;
  name: string;
  timing: IClipTiming;
  transform: IClipTransform;
  display?: IDisplay;
  trim?: ITrim;
  duration?: number;
  playbackRate?: number;
  src?: string;
  text?: string;
  locked?: boolean;
  textCase?: "none" | "uppercase" | "lowercase";
  verticalAlign?: "top" | "center" | "bottom";
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface IVideoClip extends IBaseClip {
  type: "Video";
  src: string;
  style?: IBaseClipStyle;
}
export interface IAudioClip extends IBaseClip {
  type: "Audio";
  src: string;
  style?: IBaseClipStyle;
}
export interface IImageClip extends IBaseClip {
  type: "Image";
  src: string;
  style?: IBaseClipStyle;
}
export interface ITextClip extends IBaseClip {
  type: "Text";
  text: string;
  style?: ITextStyle;
}

export interface ICaptionWord {
  text: string;
  from: number;
  to: number;
  isKeyWord?: boolean;
  paragraphIndex?: number;
}

export interface ICaptionWordStyle {
  color?: string;
  border?: {
    color?: string;
    width?: number;
  };
  background?: string;
}

export interface ICaptionColors {
  /** Currently spoken word — null/undefined to disable */
  active?: ICaptionWordStyle | null;
  /** Upcoming / future words — null/undefined to disable */
  future?: ICaptionWordStyle | null;
  /** Keyword words (isKeyWord=true) — null/undefined to disable */
  keyword?: {
    color?: string;
    preserveAfterSpoken?: boolean;
  } | null;
}

export interface IClipStroke {
  color: string;
  width: number;
  join?: "miter" | "round" | "bevel";
  cap?: "butt" | "round" | "square";
  miterLimit?: number;
}

export interface IClipShadow {
  color?: string;
  alpha?: number;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface IBaseClipStyle {
  borderRadius?: number;
  stroke?: IClipStroke;
  shadow?: IClipShadow;
}

export interface ITextStyle extends IBaseClipStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  align?: "left" | "center" | "right";
  fontUrl?: string;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textCase?: "none" | "uppercase" | "lowercase" | "title";
  verticalAlign?: "top" | "center" | "bottom";
}

export interface ICaptionStyle extends ITextStyle {}

export interface ICaptionClip extends IBaseClip {
  type: "Caption";
  text: string;
  mediaId: string;
  wordsPerLine: "single" | "multiple";
  caption: {
    words: ICaptionWord[];
    colors?: ICaptionColors;
    /** @deprecated use colors.keyword.preserveAfterSpoken */
    preserveKeywordColor?: boolean;
    positioning?: {
      videoWidth?: number;
      videoHeight?: number;
      bottomOffset?: number;
    };
    wordAnimation?: ICaptionWordAnimation;
  };
  style: ICaptionStyle;
}

export interface ICaptionWordAnimation {
  type: "scale" | "opacity";
  application: "none" | "active" | "keyword";
  value: number;
  mode?: "static" | "dynamic";
}

export interface ITransitionClip extends IBaseClip {
  type: "Transition";
  transitionKey: string;
  fromClipId?: string | null;
  toClipId?: string | null;
}

export interface IEffectClip extends IBaseClip {
  type: "Effect";
  effectKey: string;
  values?: Record<string, any>;
}

export type ShapeType = "rectangle";

export interface IShapeStyle extends IBaseClipStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: IClipStroke;
  borderRadius?: number; // for rectangle rounded corners (consistent with Video)
  sides?: number; // for polygon and star
  innerRadius?: number; // for star
  points?: number[]; // for custom polygon points
}

export interface IShapeClip extends IBaseClip {
  type: "Shape";
  shapeType: ShapeType;
  style: IShapeStyle;
}

export type AnyClip =
  | IVideoClip
  | IAudioClip
  | IImageClip
  | ITextClip
  | ICaptionClip
  | ITransitionClip
  | IEffectClip
  | IShapeClip;

export interface ITrack {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
  accepts?: string[];
  static?: boolean;
}

export interface IProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor?: string;
}

export interface IProject {
  settings: IProjectSettings;
  tracks: ITrack[];
  clips: Record<string, AnyClip>;
}

export interface IScaleState {
  zoom: number;
  unit: number;
  segments: number;
  index: number;
}
