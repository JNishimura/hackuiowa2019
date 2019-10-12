# Weather API Calls
Using `NOAA API V2` in order get local weather data based on the user's start and endpoint location. We can also use historical weather data to show off functionality. Plan on using the `Precipitation 15 Minute` data set with `api call: https://www.ncdc.noaa.gov/cdo-web/api/v2/datasets/{id}". https://www.ncdc.noaa.gov/cdo-web/webservices/v2#datasets  
http://mesonet.agron.iastate.edu/ogc/?fbclid=IwAR1WAJ1fyKop299shSJ5DAgEGTLlqMijKATWNV0_vgzZdOOyVF0sk9WbGMk
https://www1.ncdc.noaa.gov/pub/data/cdo/documentation/PRECIP_15_documentation.pdf

# Weather Radar Image 
We need to find api that will create weather radar images for us to overlay on mapbox. Preferably on that can specify the general area around a location. Ideas: wunderground
# Mapbox Display
Using Mapbox to show off the display of the map overlayed with weather radar image as well as the driving route displayed. Will also have a textbox to input the desired location and request their starting location to construct driving routes.  
# Driving Routes Based on Weather Intensity
The project will also implement an algorithm that constructs the shortest distance that can avoid blocks of bad weather, incredibly important for truckers that traditionally pick rurual routes which can be quite dangrous during extremely rainy or windy weather. We will also present regular driving routes and take into consideration traffic on the suggested routes.
# Why this matters
Huge effect on economy and dangers to truckers that create the backbone of the economy. Useful for long distance traveling by car as weather is constantly changing you need to be able to change your route on the fly. Currently truckers have to spend time looking up weather and picking routes themselves but with this all built in one, it makes their job much easier.
