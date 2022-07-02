import Container from "react-bootstrap/Container";
import React from "react";
import { Nav, Navbar, NavDropdown } from "react-bootstrap";
import logo from "../../src/images/Freeshuffle.png";

export default function NavBar(props) {
  return (
    <Navbar expand="lg">
      <Navbar.Brand href="#home">
        <img alt="" src={logo} className="d-inline-block align-top" />
      </Navbar.Brand>
      {/* leave commented until functionality is built out */}
      {/* <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto"></Nav>
        </Navbar.Collapse> */}
    </Navbar>
  );
}
