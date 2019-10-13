type PrecipType = "rain" | "sleet" | "snow"

export default class PointProps {
    color: string;
    icon: string | null;
    precipProb: number;
    precipIntensity: number;
    precipType: PrecipType | null;
    summary: string;

    constructor(color: string) {
        this.color = color;
        this.icon = null;
        this.precipProb = 0;
        this.precipIntensity = 0;
        this.precipType = null;
        this.summary = "";
    }
}