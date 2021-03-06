import React, { useState, useEffect } from "react";
import {
  Jumbotron,
  Container,
  CardColumns,
  Card,
  Button,
} from "react-bootstrap";
import Auth from "../utils/auth";
import { Form, Col } from "react-bootstrap";
import { savePlaceIds, getSavedPlaceIds } from "../utils/localStorage";
import { useMutation } from "@apollo/client";
import { SAVE_PLACE } from "../utils/mutations";
//import { QUERY_ME } from '../utils/query';
import { md5 } from "../utils/md5";
//import { lon2tile, lat2tile } from '../utils/tileHelper';

const SearchPlaces = () => {
  // create state for holding returned opentripmap api data
  const [searchedPlaces, setSearchedPlaces] = useState([]);
  // create state for holding our search field data
  const [searchInput, setSearchInput] = useState("");

  // create state to hold saved placeId values
  const [savedPlaceIds, setSavedPlaceIds] = useState(getSavedPlaceIds());
  // define savePlace() from mutation
  const [savePlace] = useMutation(SAVE_PLACE);

  // set up useEffect hook to save `savedplaceIds` list to localstorage on component unmount

  useEffect(() => {
    return () => savePlaceIds(savedPlaceIds);
  });

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!searchInput) {
      return false;
    }

    try {
      console.log(process.env.REACT_APP_OPEN_TRIP);
      const response = await fetch(
        `https://api.opentripmap.com/0.1/en/places/geoname?name=${searchInput}&apikey=${process.env.REACT_APP_OPEN_TRIP}`
      );
      const parsedJson = await response.json();

      console.log(parsedJson.lat);
      console.log(parsedJson.lon);
      const lat = parsedJson.lat;
      const lon = parsedJson.lon;
      const radius = "20000";

      const responseNew = await fetch(
        `https://api.opentripmap.com/0.1/en/places/autosuggest?name=${searchInput}&lat=${lat}&lon=${lon}&radius=${radius}&apikey=${process.env.REACT_APP_OPEN_TRIP}`
      );

      if (!response.ok) {
        throw new Error("something went wrong!");
      }

      const { features } = await responseNew.json();

      const placeData = features.map((place) => ({
        placeId: place.properties.xid,
        // placeName: place.properties.name,
        placeInfo: place.properties.wikidata,
        placeDescription: place.properties.highlighted_name,
        placeType: place.properties.kinds
          .replaceAll(",", ", ")
          .replaceAll("_", " "),
        //placeLat: place.geometry.coordinates[0],
        //placeLon: place.geometry.coordinates[1]
      }));

      // attach image to places when possible
      for (const place of placeData) {
        if (place.placeInfo) {
          //query the mediawiki API:
          const fetchString = `https://noahs-server-proj1.herokuapp.com/https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&format=json&entity=${place.placeInfo}`;
          const mediaWikiResponse = await fetch(fetchString);
          const data = await mediaWikiResponse.json();

          //if an image exists, save image URL in place.placeImage
          if (data.claims.P18) {
            const imageName =
              data.claims.P18[0].mainsnak.datavalue.value.replaceAll(" ", "_");
            const md5Hash = md5(imageName);
            const ab = md5Hash.substring(0, 2);
            const a = ab.substring(0, 1);
            place.placeImage = `https://upload.wikimedia.org/wikipedia/commons/${a}/${ab}/${imageName}`;
          } else {
            // No image for this location
          }
        }

        //handle drawing tiles
        //const zoom = 12;
        //console.log(lat2tile(place.placeLat, zoom))
        //console.log(lon2tile(place.placeLon, zoom))
      }

      setSearchedPlaces(placeData);
      setSearchInput("");
    } catch (err) {
      console.error(err);
    }
  };

  // create a function to handle saving a place to our database
  const handleSavePlace = async (placeId) => {
    // find the place in `searchedPlaces` state by the matching id
    const placeToSave = searchedPlaces.find(
      (place) => place.placeId === placeId
    );

    // get token
    const token = Auth.loggedIn() ? Auth.getToken() : null;

    if (!token) {
      return false;
    }

    try {
      const { data } = await savePlace({
        variables: { newPlace: { ...placeToSave } },
      });

      // if place successfully saves to user's account, save place id to state
      setSavedPlaceIds([...savedPlaceIds, placeToSave.placeId]);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <>
      <Jumbotron fluid className="text-light bg-primary">
        <Container>
          <h1>Search for Locations!</h1>
          <Form onSubmit={handleFormSubmit}>
            <Form.Row className="searchForm">
              <Form.Control
                className="searchFormInput"
                name="searchInput"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                type="text"
                size="lg"
                placeholder={
                  searchedPlaces.length
                    ? `Viewing ${searchedPlaces.length} results`
                    : "Search for a location to begin!"
                }
              />
              <Button className="searchBtn" type="submit" variant="success" size="lg">
                Submit Search
              </Button>
            </Form.Row>
          </Form>
        </Container>
      </Jumbotron>
      <section className="hero hero-search card-stack">
        <Container>
          {/* <h4>
            {searchedPlaces.length
              ? `Viewing ${searchedPlaces.length} results:`
              : "Search for a location to begin"}
          </h4> */}
          <CardColumns>
            {searchedPlaces.map((place) => {
              return (
                <Card key={place.placeId} border="dark">
                  <Card.Body>
                    <Card.Img className="cardImage" src={place.placeImage} />
                    <Card.Title
                      dangerouslySetInnerHTML={{
                        __html: place.placeDescription,
                      }}
                    ></Card.Title>
                    <p className="small">
                      Info:{" "}
                      {place.placeInfo ? (
                        <a
                          href={`http://www.wikidata.org/entity/${place.placeInfo}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Wikidata
                        </a>
                      ) : (
                        "Not Available!"
                      )}
                    </p>
                    <Card.Text> Kinds: {place.placeType}</Card.Text>

                    {Auth.loggedIn() && (
                      <Button
                        disabled={savedPlaceIds?.some(
                          (savedPlaceId) => savedPlaceId === place.placeId
                        )}
                        className="btn-block btn-info"
                        onClick={() => handleSavePlace(place.placeId)}
                      >
                        {savedPlaceIds?.some(
                          (savedPlaceId) => savedPlaceId === place.placeId
                        )
                          ? "This location has already been saved!"
                          : "Save this location!"}
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              );
            })}
          </CardColumns>
        </Container>
      </section>
    </>
  );
};

export default SearchPlaces;
