import Container from "react-bootstrap/Container";
import React, { useEffect, useState } from "react";
import { Button, Modal, Nav, Navbar, NavDropdown, Row } from "react-bootstrap";
import logo from "../../src/images/Freeshuffle.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap } from "@fortawesome/free-solid-svg-icons";
import "./NavBar.scss";

export default function NavBar({
  routeDistance,
  origin,
  mode,
  firstStop,
  secondStop,
}) {
  const [showExport, setShowExport] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    // reverse coordinates for hyperlink format
    const reversedOrigin = [...origin].reverse();
    const reversedFirst = [...firstStop].reverse();
    const reversedSecond = [...secondStop].reverse();
    setLink(
      encodeURI(
        `https://www.google.com/maps/dir/?api=1&origin=${reversedOrigin.toString()}&destination=${reversedOrigin.toString()}&travelmode=${
          mode === "running" ? "walking" : "bicycling"
        }&waypoints=${reversedFirst.toString()}|${reversedSecond.toString()}`
      )
    );
  }, [firstStop]);

  useEffect(() => {
    console.log(link);
  }, [link]);

  const onExportClicked = () => setShowExport(true);
  const handleClose = () => setShowExport(false);

  return (
    <>
      <Navbar expand="lg">
        <Navbar.Brand href="#home">
          <img alt="" src={logo} className="d-inline-block align-top" />
        </Navbar.Brand>
        {/* leave commented until functionality is built out */}
        {/* <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto"></Nav>
          </Navbar.Collapse> */}
        {routeDistance > 0 && <Button onClick={onExportClicked}>Export</Button>}
      </Navbar>
      <Modal show={showExport} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Export Route</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <a href={link} target="_blank">
              <Row className="export-row">
                <p>Export to Google Maps</p>
                <FontAwesomeIcon icon={faMap} className="icon" />
              </Row>
            </a>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
