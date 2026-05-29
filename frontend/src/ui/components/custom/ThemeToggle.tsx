import { Button } from "~/ui/components/ui/Button";
import { Separator } from "~/ui/components/ui/Separator";
import { useTheme } from "~/ui/providers/ThemeProvider";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

type ThemeToggleProps = {
  trigger?: React.ReactNode;
};

export function ThemeToggle({ trigger }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme();

  const themeLabelMap: Record<string, string> = {
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
    "retro-light": "复古浅色",
    "retro-dark": "复古深色",
  };
  const themeLabel = themeLabelMap[theme] ?? theme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? <Button variant="outline">{themeLabel}</Button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("system")}>
          跟随系统
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          浅色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          深色
        </DropdownMenuItem>
        <Separator />
        <DropdownMenuItem onClick={() => setTheme("retro-light")}>
          复古浅色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("retro-dark")}>
          复古深色
        </DropdownMenuItem>
        <Separator />
        <p
          className={`
            mb-1 ml-2 mt-2 hidden text-[10px] text-muted-foreground

            sm:block
          `}
        >
          也可按 t 切换
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
