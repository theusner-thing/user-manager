import {
  Controller,
  Get,
  Query,
  Param,
  Put,
  Body,
  Req,
  Post,
  Delete,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CanEditUserGuard } from '../../common/guards/can-edit-user.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('q') q?: string,
    @Query('order') order?: string,
  ) {
    const p = parseInt(page as any, 10) || 1;
    const l = parseInt(limit as any, 10) || 10;
    return this.usersService.search(p, l, q, order);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    return this.usersService.deleteById(id);
  }

  @Put(':id')
  @UseGuards(CanEditUserGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() body: any, @Req() req: any) {
    return this.usersService.create(body);
  }

  @Post('import')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: any) {
    return this.usersService.import(file);
  }

  @Post('bulk-delete')
  @UseGuards(AdminGuard)
  async bulkDelete(@Body() body: any) {
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    return this.usersService.bulkDelete(ids);
  }
}
