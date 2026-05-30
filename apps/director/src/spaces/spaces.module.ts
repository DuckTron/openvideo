import { Module } from "@nestjs/common";
import { SpacesService } from "./spaces.service";

@Module({
  imports: [],
  controllers: [],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
