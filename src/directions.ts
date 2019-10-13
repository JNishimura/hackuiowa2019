// typedefs for MapBox's Direction API responses
export type Directions = {
    routes: Route[],
    waypoints: any[],
    code: string,
    uuid: string,
};

export type Route = {
    distance: number, // distance in meters
    duration: number, // travel time in seconds
    weight_name: string, // type of weighting used
    weight: number, // actual weight
    legs: RouteLeg[], // route legs
};

export type RouteLeg = {
    distance: number, // distance in meters
    duration: number, // travel time in seconds
    steps: RouteStep[], // array of step objects, if any
    summary: string, // summary of the leg (street name)
};

export type RouteStep = {
    maneuver: any, // step maneuver, not used
    distance: number, // distance in meters
    duration: number, // travel time in seconds
    intersections: {
        location: [number, number] // lon, lat
    }[]
};