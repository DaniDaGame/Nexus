"use client";

import React, { useState } from "react";
import { useSignUp } from "@clerk/clerk-react";

const SignUpForm = () => {
  // State variables
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Clerk hook for sign-up
  const { isLoaded, signUp } = useSignUp();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password and confirm password
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      // Start the sign-up process
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Log success (or redirect the user)
      console.log("Verification email sent!");
    } catch (err) {
      // Handle Clerk errors
      if (typeof err === "object" && err !== null && "errors" in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(clerkError.errors[0].message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Email Field */}
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* Password Field */}
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {/* Confirm Password Field */}
      <div>
        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {/* Error Message */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Submit Button */}
      <button type="submit">Sign Up</button>
    </form>
  );
};

export default SignUpForm;