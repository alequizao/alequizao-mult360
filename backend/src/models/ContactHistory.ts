import { Table, Column, CreatedAt, Model, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType } from "sequelize-typescript";
import Contact from "./Contact";
import User from "./User";

// ALEQUIZAO: histórico de edições do contato (quem mudou o quê e quando)
@Table({ tableName: "ContactHistories", updatedAt: false })
class ContactHistory extends Model<ContactHistory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  userName: string;

  @Column
  action: string; // criado | editado | excluido

  @Column(DataType.TEXT)
  changes: string; // JSON [{campo, de, para}]

  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;
}

export default ContactHistory;
