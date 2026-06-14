"use client";
import * as React from "react";
import { Envelope } from "@phosphor-icons/react";

export function MailIcon(props: React.ComponentProps<typeof Envelope>) {
  return <Envelope {...props} />;
}
