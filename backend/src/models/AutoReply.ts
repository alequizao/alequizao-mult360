import { Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default, AllowNull } from "sequelize-typescript";
import Company from "./Company";

// ALEQUIZAO: resposta automática por palavra-chave (sem fila)
@Table({ tableName: "AutoReplies" })
class AutoReply extends Model<AutoReply> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  keywords: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  reply: string;

  @Default("contains")
  @Column
  matchType: string; // contains | word | starts | exact | regex

  @Default(true)
  @Column
  active: boolean;

  @Default(false)
  @Column
  onlyWithoutUser: boolean;

  @Default(true)
  @Column
  stopFlow: boolean;

  @Default(60)
  @Column
  cooldownMinutes: number;

  @Default(0)
  @Column
  hits: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AutoReply;
