import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa"; // иконки
import "./BackButton.css";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button className="back-button" onClick={() => navigate(-1)}>
      <FaArrowLeft /> Назад
    </button>
  );
}
